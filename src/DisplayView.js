import {useEffect, useRef} from 'react'
import {WINDOWS} from 'idealos_schemas/js/windows.js'
import {GRAPHICS} from 'idealos_schemas/js/graphics.js'
import {Manager} from './WindowManager.js'

const settings = {
    window_name:true,
    window_size:true,
}

const manager = new Manager()

function HBox({children}) {
    return <div className={'hbox'}>{children}</div>
}

export function DisplayView({connection}) {
    manager.setConnection(connection)
    let canvas = useRef()


    function redraw() {
        if(canvas.current) {
            manager.redraw(canvas.current.getContext('2d'),canvas.current,settings)
        }
    }
    function toggle_prop(name) {
        settings[name] = !settings[name]
        redraw()
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

    return <div>
        <HBox>
            <button onClick={()=>toggle_prop("window_name")}>name</button>
            <button onClick={()=>toggle_prop("window_size")}>size</button>
        </HBox>
        <canvas className={'display-view'} style={{
        border: '1px solid black'
    }} width={500} height={500} ref={canvas}
                   onMouseDown={mouse_down}
                   onMouseMove={mouse_move}
                   onMouseUp={mouse_up}
    /></div>
}