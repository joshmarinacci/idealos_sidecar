import {useEffect, useRef} from 'react'
import {WINDOWS} from 'idealos_schemas/js/windows.js'
import {GRAPHICS} from 'idealos_schemas/js/graphics.js'
import {Point, Bounds} from "./math.js"
import {INPUT} from 'idealos_schemas/js/input.js'

class Manager {
    constructor() {
        this.windows_list = []
        this.windows_map = {}
        this.SCALE = 2
        this.drag_started = false
        this.focused_window = ""
    }
    init_windows(windows) {
        this.windows_list = []
        this.windows_map = {}
        Object.values(windows).forEach((win)=> this.open_window(win))
    }
    open_window(win) {
        console.log("new window is",win)
        let keys = ['id','x','y','width','height']
        keys.forEach(key => {
            if(!win.hasOwnProperty(key)) throw new Error(`Missing window.${key}`)
        })
        let w = {
            id:win.id,
            owner:win.owner,
            window_type:win.window_type,
            bounds: new Bounds(win.x,win.y,win.width,win.height),
            chrome:new Bounds(win.x-2,win.y-2-10,win.width+2+2,win.height+2+10+2),
        }
        w.canvas = document.createElement('canvas')
        w.canvas.width = w.bounds.width
        w.canvas.height = w.bounds.height
        let ctx = w.canvas.getContext('2d')
        ctx.fillStyle = 'black'
        ctx.fillRect(0,0,w.canvas.width,w.canvas.height)
        // ctx.fillStyle = 'red'
        // ctx.fillRect(0,0,w.canvas.width/2,w.canvas.height/2)
        this.windows_list.push(w)
        this.windows_map[w.id] = w
    }
    open_child_window(msg) {
        let win = msg.window
        let w = {
            id:win.id,
            owner:win.owner,
            parent:msg.parent,
            window_type:win.window_type,
            bounds: new Bounds(win.x,win.y,win.width,win.height),
            chrome:new Bounds(win.x-2,win.y-2-10,win.width+2+2,win.height+2+10+2),
        }
        console.log("new child window",w);
        w.canvas = document.createElement('canvas')
        w.canvas.width = w.bounds.width
        w.canvas.height = w.bounds.height
        let ctx = w.canvas.getContext('2d')
        ctx.fillStyle = 'red'
        ctx.fillRect(0,0,w.canvas.width,w.canvas.height)
        this.windows_list.push(w)
        this.windows_map[w.id] = w

    }
    close_window(window) {
        let win = this.findWindow(window)
        if(win) {
            this.windows_list = this.windows_list.filter(w => w.id !== win.id)
            delete this.windows_map[win.id]
        }
    }
    findWindow(win_id) {
        return this.windows_map[win_id]
    }
    redraw(c,canvas) {
        if(!c) return
        if(!this.windows_list) return
        //draw background
        c.save()
        c.imageSmoothingEnabled = false
        c.scale(this.SCALE,this.SCALE)
        c.fillStyle = 'white'
        c.fillRect(0,0,canvas.width,canvas.height)

        //for each window
        this.windows_list.forEach(win => {
            let chrome = win.chrome
            //draw chrome around the window
            if(win.window_type === 'plain') {
                c.fillStyle = 'cyan'
                if (win.id === this.focused_window) c.fillStyle = 'red'
                c.fillRect(chrome.x, chrome.y, chrome.width, chrome.height)
            }
            //draw bg of window
            c.fillStyle = 'white'
            c.fillRect(win.bounds.x,win.bounds.y,win.bounds.width,win.bounds.height)
            //draw contents of window
            c.drawImage(win.canvas,win.bounds.x,win.bounds.y)
        })
        c.restore()
    }
    draw_pixel(msg) {
        let win = this.findWindow(msg.window)
        if(!win) return
        let ctx = win.canvas.getContext('2d')
        ctx.fillStyle = msg.color
        ctx.fillRect(msg.x,msg.y,1,1)
    }
    draw_rect(msg) {
        let win = this.findWindow(msg.window)
        if(!win) return
        let ctx = win.canvas.getContext('2d')
        ctx.fillStyle = msg.color
        ctx.fillRect(msg.x,msg.y,msg.width,msg.height)
    }
    draw_image(msg) {
        let win = this.findWindow(msg.window)
        if(!win) return

        //copy pixels to new image data
        let id = new ImageData(msg.width,msg.height)
        for(let i=0; i<id.data.length; i++) id.data[i] = msg.pixels[i]

        //draw into temp canvas
        let can = document.createElement('canvas')
        can.width = msg.width;
        can.height = msg.height;
        let scratch = can.getContext('2d')
        scratch.putImageData(id,0,0)

        //draw temp canvas to window's back buffer
        let ctx = win.canvas.getContext('2d')
        ctx.drawImage(can,msg.x,msg.y)
    }

    mouse_down(e) {
        //if clicked on window or within title bar
        let rect = e.target.getBoundingClientRect();
        let cursor = new Point((e.clientX-rect.x)/this.SCALE,(e.clientY-rect.y)/this.SCALE)
        let window = this.windows_list.find(win => win.chrome.contains(cursor))
        if(window) {
            if(window.window_type === 'menubar') {
                this.send(INPUT.MAKE_MouseDown({
                    x:cursor.x-window.bounds.x,
                    y:cursor.y-window.bounds.y,
                    app:window.owner,
                    window:window.id
                }))
                return
            }
            //if inside windown content
            if(window.bounds.contains(cursor)) {
                this.send(INPUT.MAKE_MouseDown({
                    x:cursor.x-window.bounds.x,
                    y:cursor.y-window.bounds.y,
                    app:window.owner,
                    window:window.id}))
                if(window.id !== this.focused_window && window.window_type !== 'menubar' && window.window_type !== 'menu') {
                    this.send(WINDOWS.MAKE_SetFocusedWindow({window:window.id, target:window.owner}))
                    this.focused_window = window.id
                }
                return
            }
            //skip types that can be dragged or made the focus
            if(window.window_type === 'menubar') return
            if(window.window_type === 'menu') return
            this.send(WINDOWS.MAKE_SetFocusedWindow({window:window.id}))
            this.focused_window = window.id
            this.drag_started = true
            this.drag_window_id = window.id
            this.drag_offset = new Point(window.bounds.x,window.bounds.y).subtract(cursor)
        }
    }
    mouse_move(e) {
        if(!this.drag_started) return
        let rect = e.target.getBoundingClientRect();
        let cursor = new Point((e.clientX-rect.x)/this.SCALE,(e.clientY-rect.y)/this.SCALE)
        let window = this.windows_list.find(win => win.id === this.drag_window_id)
        let off = this.drag_offset.add(cursor)
        window.bounds.x = off.x
        window.bounds.y = off.y
        window.chrome.x = window.bounds.x-2
        window.chrome.y = window.bounds.y-2-10
    }
    mouse_up(e) {
        this.drag_started = false
        this.drag_window_id = ""
    }

    setConnection(connection) {
        this.connection = connection
    }
    send(msg) {
        if(this.connection) this.connection.send(msg)
    }
}

const manager = new Manager()
export function DisplayView({connection}) {
    manager.setConnection(connection)
    let canvas = useRef()

    function redraw() {
        if(canvas.current) {
            manager.redraw(canvas.current.getContext('2d'),canvas.current)
        }
    }
    function mouse_down(e) {
        manager.mouse_down(e)
        redraw()
    }
    function mouse_move(e) {
        manager.mouse_move(e)
        redraw()
    }
    function mouse_up(e) {
        manager.mouse_up(e)
        redraw()
    }
    useEffect(() => {
        connection.on("message", (msg) => {
            if (msg.type === WINDOWS.TYPE_window_list) {
                // if(!Array.isArray(msg.windows)) msg.windows = [msg.windows]
                manager.init_windows(Object.values(msg.windows))
                Object.values(msg.windows).forEach(win => {
                    connection.send(WINDOWS.MAKE_window_refresh_request({
                        target:win.owner,
                        window:win.id,
                    }))
                })
                return redraw()
            }
            if (msg.type === WINDOWS.TYPE_WindowOpenDisplay) {
                manager.open_window(msg.window)
                return redraw()
            }
            if (msg.type === WINDOWS.TYPE_create_child_window_display) {
                manager.open_child_window(msg)
                return redraw()
            }
            if (msg.type === WINDOWS.TYPE_close_child_window_display) {
                manager.close_window(msg.window)
                return redraw()
            }
            //skip
            if(msg.type === WINDOWS.TYPE_WindowOpen) return
            if(msg.type === GRAPHICS.TYPE_DrawPixel) {
                manager.draw_pixel(msg)
                if(canvas.current) manager.redraw(canvas.current.getContext('2d'),canvas.current)
                return redraw()
            }
            if(msg.type === GRAPHICS.TYPE_DrawRect) {
                manager.draw_rect(msg)
                if(canvas.current) manager.redraw(canvas.current.getContext('2d'),canvas.current)
                return redraw()
            }
            if(msg.type === GRAPHICS.TYPE_DrawImage) {
                manager.draw_image(msg)
                return redraw()
            }
            if(msg.type === WINDOWS.TYPE_window_close) {
                manager.close_window(msg.window)
                return redraw()
            }
            console.log("got message",msg)
        })
    }, [connection])

    return <canvas className={'display-view'} style={{
        border: '1px solid black'
    }} width={500} height={500} ref={canvas}
                   onMouseDown={mouse_down}
                   onMouseMove={mouse_move}
                   onMouseUp={mouse_up}
    />
}