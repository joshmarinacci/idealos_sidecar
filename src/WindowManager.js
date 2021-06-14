import {Bounds, Point} from './math.js'
import {INPUT} from 'idealos_schemas/js/input.js'
import {WINDOWS} from 'idealos_schemas/js/windows.js'

const CLOSE_BUTTON_SIZE = 8
const RESIZE_BUTTON_SIZE = 8
const BORDER_WIDTH = 1
const TITLEBAR_HEIGHT = 10
class Win {
    constructor(opts) {
        this.id = opts.id
        this.owner = opts.owner
        this.window_type = opts.window_type
        this.parent = opts.parent
        this.bounds = opts.bounds
        this.regenerate_chrome_bounds()
        this.close_button_bounds = new Bounds(0,0,CLOSE_BUTTON_SIZE,CLOSE_BUTTON_SIZE)
        this.resize_button_bounds = new Bounds(0, 0,RESIZE_BUTTON_SIZE,RESIZE_BUTTON_SIZE)
        this.reposition_chrome_buttons()
        this.regenerate_backbuffer()
    }

    reposition_chrome_buttons() {
        this.close_button_bounds.x = this.chrome.width - this.close_button_bounds.width - BORDER_WIDTH
        this.close_button_bounds.y = BORDER_WIDTH
        this.resize_button_bounds.x = this.chrome.width - this.resize_button_bounds.width
        this.resize_button_bounds.y = this.chrome.height - this.resize_button_bounds.height
    }

    regenerate_backbuffer() {
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.bounds.width
        this.canvas.height = this.bounds.height
        let ctx = this.canvas.getContext('2d')
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    regenerate_chrome_bounds() {
        this.chrome = new Bounds(this.bounds.x - BORDER_WIDTH,
            this.bounds.y - BORDER_WIDTH - TITLEBAR_HEIGHT,
            this.bounds.width + BORDER_WIDTH*2,
            this.bounds.height + BORDER_WIDTH*2 + TITLEBAR_HEIGHT)
    }
}


export class Manager {
    constructor() {
        this.windows_list = []
        this.windows_map = {}
        this.SCALE = 2
        this.drag_started = false
        this.resize_started = false
        this.focused_window = ""
        this.cursor = new Point(0, 0)
    }

    get_scale() {
        return this.SCALE
    }
    set_scale(s) {
        this.SCALE = s
    }

    init_windows(windows) {
        this.windows_list = []
        this.windows_map = {}
        Object.values(windows).forEach((win) => this.open_window(win))
    }

    open_window(win) {
        let keys = ['id', 'x', 'y', 'width', 'height']
        keys.forEach(key => {
            if (!win.hasOwnProperty(key)) throw new Error(`Missing window.${key}`)
        })
        let w = new Win({
            id: win.id,
            owner: win.owner,
            window_type: win.window_type,
            bounds: new Bounds(win.x, win.y, win.width, win.height),
        })
        this.windows_list.push(w)
        this.windows_map[w.id] = w
    }

    open_child_window(msg) {
        let win = msg.window
        let w = new Win({
            id: win.id,
            owner: win.owner,
            parent: msg.parent,
            window_type: win.window_type,
            bounds: new Bounds(win.x, win.y, win.width, win.height),
        })
        this.windows_list.push(w)
        this.windows_map[w.id] = w
    }

    close_window(winid) {
        let win = this.findWindow(winid)
        if (win) {
            this.windows_list = this.windows_list.filter(w => w.id !== win.id)
            delete this.windows_map[win.id]
        }
    }

    findWindow(win_id) {
        return this.windows_map[win_id]
    }

    redraw(c, canvas, settings) {
        try {
            if (!c) return
            if (!settings) return
            if (!this.windows_list) return

            //draw background
            c.save()
            c.imageSmoothingEnabled = false
            c.scale(this.SCALE, this.SCALE)
            c.fillStyle = 'white'
            c.fillRect(0, 0, canvas.width, canvas.height)

            //for each window
            this.windows_list.forEach(win => {
                this.draw_window_content(c, win)
                this.draw_window_chrome(c, win)
                this.draw_window_overlays(c, win, settings)
            })

            if (settings['cursor_pos']) this.draw_cursor_coords(c)
            c.restore()
        } catch (e) {
            console.log("error",e)
        }
    }

    draw_pixel(msg) {
        let win = this.findWindow(msg.window)
        if (!win) return
        let ctx = win.canvas.getContext('2d')
        ctx.fillStyle = msg.color
        ctx.fillRect(msg.x, msg.y, 1, 1)
    }

    draw_rect(msg) {
        let win = this.findWindow(msg.window)
        if (!win) return
        let ctx = win.canvas.getContext('2d')
        ctx.fillStyle = msg.color
        ctx.fillRect(msg.x, msg.y, msg.width, msg.height)
    }

    draw_image(msg) {
        let win = this.findWindow(msg.window)
        if (!win) return
        if(msg.width <= 0) return
        if(msg.height <= 0) return

        //copy pixels to new image data
        let id = new ImageData(msg.width, msg.height)
        for (let i = 0; i < id.data.length; i++) id.data[i] = msg.pixels[i]

        //draw into temp canvas
        let can = document.createElement('canvas')
        can.width = msg.width
        can.height = msg.height
        let scratch = can.getContext('2d')
        scratch.putImageData(id, 0, 0)

        //draw temp canvas to window's back buffer
        let ctx = win.canvas.getContext('2d')
        ctx.drawImage(can, msg.x, msg.y)
    }

    find_top_window_at(cursor) {
        return this.windows_list.slice().reverse().find(win => win.chrome.contains(cursor))
    }

    raise_window(window) {
        let n = this.windows_list.indexOf(window)
        console.log("window is at",window)
        if(n >= 0) {
            this.windows_list.splice(n, 1)
            this.windows_list.push(window)
        }
    }


    mouse_down(e) {
        //if clicked on window or within title bar
        //if any child windows are open, we should close them automatically, right
        let rect = e.target.getBoundingClientRect()
        let cursor = new Point((e.clientX - rect.x) / this.SCALE, (e.clientY - rect.y) / this.SCALE)
        let window = this.find_top_window_at(cursor)
        if (window) {
            if (window.window_type === 'menubar') return this.send_mousedown_to_window(cursor, window)
            if (window.window_type === 'dock') return this.send_mousedown_to_window(cursor, window)
            if (window.window_type === 'menu') return this.send_mousedown_to_window(cursor, window)
            //if inside close button
            let pt2 = window.chrome.translate_into(cursor)
            //if close button
            if(window.close_button_bounds.contains(pt2)) {
                this.send_close_window(window)
                return
            }
            //if resize button
            if(window.resize_button_bounds.contains(pt2)) {
                //set focus
                this.set_focused_window(window)
                this.resize_started = true
                this.drag_window_id = window.id
                this.drag_offset = new Point(window.bounds.x, window.bounds.y).subtract(cursor)
                this.resize_start_size = window.bounds
                return
            }
            //if inside window content send to window
            if (window.bounds.contains(cursor)) {
                this.send_mousedown_to_window(cursor, window)
                this.set_focused_window(window)
                this.raise_window(window)
                return
            }
            //set focus
            this.set_focused_window(window)
            //start moving the window
            this.drag_started = true
            this.drag_window_id = window.id
            this.drag_offset = new Point(window.bounds.x, window.bounds.y).subtract(cursor)
        }
    }

    mouse_move(e) {
        let rect = e.target.getBoundingClientRect()
        let cursor = new Point((e.clientX - rect.x) / this.SCALE, (e.clientY - rect.y) / this.SCALE)
        this.cursor = cursor
        if (this.drag_started) {
            let window = this.findWindow(this.drag_window_id)
            let off = this.drag_offset.add(cursor)
            window.bounds.x = off.x
            window.bounds.y = off.y
            window.chrome.x = window.bounds.x - BORDER_WIDTH
            window.chrome.y = window.bounds.y - BORDER_WIDTH - TITLEBAR_HEIGHT
            return
        }
        if(this.resize_started) {
            let window = this.findWindow(this.drag_window_id)
            window.chrome.width = cursor.x - window.chrome.x
            window.chrome.height = cursor.y - window.chrome.y
            window.reposition_chrome_buttons()
            return
        }
    }

    mouse_up(e) {
        let rect = e.target.getBoundingClientRect()
        let cursor = new Point((e.clientX - rect.x) / this.SCALE, (e.clientY - rect.y) / this.SCALE)
        if(this.drag_started) {
            let window = this.findWindow(this.drag_window_id)
            let off = this.drag_offset.add(cursor)
            window.bounds.x = Math.floor(off.x)
            window.bounds.y = Math.floor(off.y)
            window.regenerate_chrome_bounds()
            this.send_window_set_position(window)
        }
        if(this.resize_started) {
            let window = this.findWindow(this.drag_window_id)
            window.bounds.width = Math.floor(window.chrome.width -BORDER_WIDTH - BORDER_WIDTH)
            window.bounds.height = Math.floor(window.chrome.height -BORDER_WIDTH - BORDER_WIDTH - TITLEBAR_HEIGHT)
            window.regenerate_chrome_bounds()
            window.reposition_chrome_buttons()
            window.regenerate_backbuffer()
            this.send_window_set_size(window)
        }
        this.drag_started = false
        this.resize_started = false
        this.drag_window_id = ""
        this.drag_offset = null
        let window = this.find_top_window_at(cursor)
        if (window) {
            if (window.window_type === 'menubar') return this.send_mouseup_to_window(cursor, window)
            if (window.window_type === 'dock') return this.send_mouseup_to_window(cursor, window)
            if (window.window_type === 'menu') return this.send_mouseup_to_window(cursor, window)
            if (window.bounds.contains(cursor)) return this.send_mouseup_to_window(cursor, window)
        }
    }

    key_down(e) {
        if(!this.focused_window) return console.warn("no window focused")
        let win = this.findWindow(this.focused_window)
        let msg = INPUT.MAKE_KeyboardDown({
            key:e.key,
            code:e.code,
            shift:e.shiftKey,
            alt:e.altKey,
            meta:e.metaKey,
            control:e.ctrlKey,
            app:win.owner,
            window:win.id
        })
        console.log("key event",e,msg)
        this.send(msg)

    }

    setConnection(connection) {
        this.connection = connection
    }

    send(msg) {
        if (this.connection) this.connection.send(msg)
    }

    send_mousedown_to_window(cursor, window) {
        this.send(INPUT.MAKE_MouseDown({
            x: cursor.x - window.bounds.x,
            y: cursor.y - window.bounds.y,
            app: window.owner,
            window: window.id
        }))
    }

    send_mouseup_to_window(cursor, window) {
        this.send(INPUT.MAKE_MouseUp({
            x: cursor.x - window.bounds.x,
            y: cursor.y - window.bounds.y,
            app: window.owner,
            window: window.id
        }))
    }

    set_focused_window(window) {
        if (window.id !== this.focused_window && window.window_type !== 'menubar' && window.window_type !== 'menu' && window.window_type !== 'dock') {
            this.send(WINDOWS.MAKE_SetFocusedWindow({window: window.id, target: window.owner}))
            this.focused_window = window.id
        }
    }

    send_mousemove_to_window(cursor, window) {
        this.send(INPUT.MAKE_MouseMove({
            x: cursor.x - window.bounds.x,
            y: cursor.y - window.bounds.y,
            app: window.owner,
            window: window.id
        }))
    }

    draw_cursor_coords(c) {
        c.save()
        c.translate(this.cursor.x + 10, this.cursor.y - 10)
        c.scale(0.7, 0.7)
        c.fillStyle = 'white'
        c.fillRect(0, 0, 50, 15)
        c.fillStyle = 'black'
        c.font = 'plain 5px sans-serif'
        c.fillText(Math.floor(this.cursor.x) + "," + Math.floor(this.cursor.y), 2, 13)
        c.strokeStyle = 'black'
        c.strokeRect(0, 0, 50, 15)
        c.restore()
    }

    draw_window_content(c,win) {
        {
            //draw bg of window
            c.fillStyle = 'orange'
            c.fillRect(win.bounds.x, win.bounds.y, win.bounds.width, win.bounds.height)
            //draw contents of window
            c.drawImage(win.canvas, win.bounds.x, win.bounds.y)
        }
    }
    draw_window_chrome(c,win) {
        //draw chrome around the window
        if (win.window_type === 'plain') {
            let chrome = win.chrome

            //background and border
            c.fillStyle = 'black'
            if (win.id === this.focused_window) c.fillStyle = 'red'
            c.save()
            c.translate(chrome.x,chrome.y)
            c.fillRect(0,0,BORDER_WIDTH,chrome.height) //left edge
            c.fillRect(chrome.width-BORDER_WIDTH,0,BORDER_WIDTH,chrome.height) //right edge
            c.fillRect(BORDER_WIDTH,0,chrome.width-BORDER_WIDTH*2,BORDER_WIDTH+TITLEBAR_HEIGHT) //top
            c.fillRect(BORDER_WIDTH,chrome.height-BORDER_WIDTH,chrome.width-BORDER_WIDTH*2,BORDER_WIDTH)

            //close button
            {
                c.fillStyle = 'black'
                let button = win.close_button_bounds
                c.fillRect(button.x, button.y, button.width, button.height)
                c.fillStyle = 'white'
                c.fillRect(button.x+1, button.y+1, button.width-2, button.height-2)
            }


            //resize button
            {
                c.fillStyle = 'black'
                let button = win.resize_button_bounds
                c.fillRect(button.x, button.y, button.width, button.height)
                c.fillStyle = 'white'
                c.fillRect(button.x+1, button.y+1, button.width-2, button.height-2)
            }
            c.restore()
        }
    }
    draw_window_overlays(c,win,settings) {

        if (settings.window_name) {
            c.save()
            let name = win.owner + ":" + win.id
            c.translate(win.chrome.x + win.chrome.width, win.chrome.y + win.chrome.height)
            c.scale(0.7, 0.7)
            c.font = 'plain 16px sans-serif'
            let metrics = c.measureText(name)
            c.translate(-metrics.width, 0)
            let g = 2
            c.fillStyle = 'black'
            c.fillRect(-g, -g, metrics.width+g*2, 20+g*2)
            c.fillStyle = 'white'
            g = 1
            c.fillRect(-g, -g, metrics.width+g*2, 20+g*2)
            c.fillStyle = 'black'
            c.fillText(name, 0, 10)
            c.restore()
        }

        if (settings.window_size) {
            c.save()
            let name = `${win.bounds.x},${win.bounds.y} ${win.bounds.width}x${win.bounds.height}`
            c.translate(win.bounds.x + win.bounds.width, win.bounds.y + win.bounds.height)
            c.scale(0.7, 0.7)
            c.font = 'plain 16px sans-serif'
            let metrics = c.measureText(name)
            c.translate(-metrics.width, -10)
            c.fillStyle = 'white'
            c.fillRect(0, 0, metrics.width, 20)
            c.fillStyle = 'black'
            c.fillText(name, 0, 10)
            c.restore()
        }

    }

    send_close_window(win) {
        this.send(WINDOWS.MAKE_window_close_request({
            target:win.owner,
            window:win.id
        }))
    }

    send_window_set_position(win) {
        this.send(WINDOWS.MAKE_WindowSetPosition({
            app:win.owner,
            window:win.id,
            x:win.bounds.x,
            y:win.bounds.y,
        }))
    }

    send_window_set_size(win) {
        this.send({
            type:"window-set-size",
            app:win.owner,
            window:win.id,
            width:win.bounds.width,
            height:win.bounds.height,
        })
    }

}
