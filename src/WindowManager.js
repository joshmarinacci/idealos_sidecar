import {Bounds, Point} from './math.js'
import {INPUT} from 'idealos_schemas/js/input.js'
import {WINDOWS} from 'idealos_schemas/js/windows.js'

const CLOSE_INSET = 5
class Win {
    constructor(opts) {
        this.id = opts.id
        this.owner = opts.owner
        this.window_type = opts.window_type
        this.parent = opts.parent
        this.bounds = opts.bounds
        this.chrome = opts.chrome
        this.close_button_bounds = new Bounds(this.chrome.width-CLOSE_INSET-1,1,CLOSE_INSET,CLOSE_INSET)
        this.canvas = document.createElement('canvas')
        this.canvas.width = this.bounds.width
        this.canvas.height = this.bounds.height
        let ctx = this.canvas.getContext('2d')
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
}

export class Manager {
    constructor() {
        this.windows_list = []
        this.windows_map = {}
        this.SCALE = 2
        this.drag_started = false
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
            chrome: new Bounds(win.x - 2, win.y - 2 - 10, win.width + 2 + 2, win.height + 2 + 10 + 2)
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
            chrome: new Bounds(win.x - 2, win.y - 2 - 10, win.width + 2 + 2, win.height + 2 + 10 + 2)
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
            this.draw_window(c,win)
            this.draw_window_overlays(c,win,settings)
        })

        this.draw_cursor_coords(c)
        c.restore()
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

    mouse_down(e) {
        //if clicked on window or within title bar
        let rect = e.target.getBoundingClientRect()
        let cursor = new Point((e.clientX - rect.x) / this.SCALE, (e.clientY - rect.y) / this.SCALE)
        let window = this.windows_list.find(win => win.chrome.contains(cursor))
        if (window) {
            if (window.window_type === 'menubar') return this.send_mousedown_to_window(cursor, window)
            if (window.window_type === 'dock') return this.send_mousedown_to_window(cursor, window)
            if (window.window_type === 'menu') return this.send_mousedown_to_window(cursor, window)
            //if inside window content send to window
            if (window.bounds.contains(cursor)) {
                this.send_mousedown_to_window(cursor, window)
                this.set_focused_window(window)
                return
            }
            //if inside close button
            let pt2 = window.chrome.translate_into(cursor)
            if(window.close_button_bounds.contains(pt2)) {
                this.send_close_window(window)
                return
            }
            //skip types that can be dragged or made the focus
            this.set_focused_window(window)
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
            let window = this.windows_list.find(win => win.id === this.drag_window_id)
            let off = this.drag_offset.add(cursor)
            window.bounds.x = off.x
            window.bounds.y = off.y
            window.chrome.x = window.bounds.x - 2
            window.chrome.y = window.bounds.y - 2 - 10
        } else {
            //send to first window underneath
            let window = this.windows_list.find(win => win.bounds.contains(cursor))
            if (window) return this.send_mousemove_to_window(cursor, window)
        }
    }

    mouse_up(e) {
        this.drag_started = false
        this.drag_window_id = ""
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
    draw_window(c,win) {
        //draw chrome around the window
        if (win.window_type === 'plain') {
            let chrome = win.chrome
            c.fillStyle = 'cyan'
            if (win.id === this.focused_window) c.fillStyle = 'red'
            c.fillRect(chrome.x, chrome.y, chrome.width, chrome.height)

            c.fillStyle = 'black'
            let button = win.close_button_bounds
            c.fillRect(chrome.x+button.x, chrome.y+button.y,button.width,button.height)
        }

        //draw bg of window
        c.fillStyle = 'white'
        c.fillRect(win.bounds.x, win.bounds.y, win.bounds.width, win.bounds.height)
        //draw contents of window
        c.drawImage(win.canvas, win.bounds.x, win.bounds.y)
    }
    draw_window_overlays(c,win,settings) {

        if (settings.window_name) {
            c.save()
            let name = win.owner + ":" + win.id
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
}