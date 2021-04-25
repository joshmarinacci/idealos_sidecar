import {useEffect, useRef} from 'react'
import {WINDOWS} from 'idealos_schemas/js/windows.js'
import {GRAPHICS} from 'idealos_schemas/js/graphics.js'

class Manager {


    constructor() {
        this.windows_list = []
        this.windows_map = {}
    }

    redraw(c,canvas) {
        if(!c) return
        if(!this.windows_list) return
        //draw background
        c.fillStyle = 'white'
        c.fillRect(0,0,canvas.width,canvas.height)

        //for each window
        this.windows_list.forEach(win => {
            // console.log("drawing window",win)
            //draw chrome around the window
            c.fillStyle = 'cyan'
            c.fillRect(win.x-2,win.y-10,win.width+2+2, win.height+10+2)
            //draw bg of window
            c.fillStyle = 'white'
            c.fillRect(win.x,win.y,win.width,win.height)
            //draw contents of window
            c.drawImage(win.canvas,win.x,win.y)
        })
    }
    init_windows(windows) {
        this.windows_list = []
        this.windows_map = {}
        Object.values(windows).forEach((win)=>{
            this.open_window(win)
        })
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
    findWindow(win_id) {
        return this.windows_map[win_id]
    }

    open_window(win) {
        console.log("new window is",win)
        let w = {
            id:win.id,
            owner:win.owner,
            width:win.width,
            height:win.height,
            x:win.x,
            y:win.y,
            window_type:win.window_type,
        }
        w.canvas = document.createElement('canvas')
        w.canvas.width = w.width
        w.canvas.height = w.height
        let ctx = w.canvas.getContext('2d')
        ctx.fillStyle = 'blue'
        ctx.fillRect(0,0,w.canvas.width,w.canvas.height)
        // ctx.fillStyle = 'red'
        // ctx.fillRect(0,0,w.canvas.width/2,w.canvas.height/2)
        this.windows_list.push(w)
        this.windows_map[w.id] = w
    }

    close_window(window) {
        let win = this.findWindow(window)
        if(win) {
            console.log("really removing the window",win)
            this.windows_list = this.windows_list.filter(w => w.id !== win.id)
            delete this.windows_map[win.id]
        }
    }
}

const manager = new Manager()
export function DisplayView({connection}) {
    let canvas = useRef()

    function redraw() {
        if(canvas.current) manager.redraw(canvas.current.getContext('2d'),canvas.current)
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
            if (msg.type === WINDOWS.TYPE_WindowOpen) {
                console.log("window open message is",msg)
                manager.open_window(msg)
                return redraw()
            }
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
                if(canvas.current) manager.redraw(canvas.current.getContext('2d'),canvas.current)
                return redraw()
            }
            if(msg.type === WINDOWS.TYPE_window_close) {
                manager.close_window(msg.window)
                if(canvas.current) manager.redraw(canvas.current.getContext('2d'),canvas.current)
                return redraw()
            }
            console.log("got message",msg)
        })
    }, [connection])

    return <canvas className={'display-view'} style={{
        border: '1px solid black'
    }} width={400} height={300} ref={canvas}/>
}