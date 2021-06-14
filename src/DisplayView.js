import {useEffect, useRef, useState} from 'react'
import {WINDOWS} from 'idealos_schemas/js/windows.js'
import {GRAPHICS} from 'idealos_schemas/js/graphics.js'
import {Manager} from './WindowManager.js'

const settings = {
    window_name:true,
    window_size:false,
    cursor_pos:false,
}

function HBox({children}) {
    return <div className={'hbox'}>{children}</div>
}
function VBox({children}) {
    return <div className={'vbox'}>{children}</div>
}

function Spacer() {
    return <span className={"spacer"}/>
}


export function DisplayView({connection,manager,tracker}) {
    manager.setConnection(connection)
    let canvas = useRef()

    const [zoom,set_zoom] = useState(1)
    manager.set_scale(Math.pow(2,zoom))

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

    function key_down(e) {
        manager.key_down(e)
        redraw()
    }

    function zoom_in() {
        set_zoom(zoom+1)
    }
    function zoom_out() {
        set_zoom(zoom-1)
    }


    function screenshot_desktop() {
        if(canvas.current) {
            let data = canvas.current.toDataURL('image/png')
            const downloadAnchorNode = document.createElement('a')
            downloadAnchorNode.setAttribute("href",     data);
            downloadAnchorNode.setAttribute("download", 'screenshot.png');
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
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
            if(msg.type === 'request-font-response') {
                console.log("Manager is",manager)
                manager.font_received(msg)
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
                tracker.draw_rect(msg)
                manager.draw_rect(msg)
                if(canvas.current) manager.redraw(canvas.current.getContext('2d'),canvas.current)
                return redraw()
            }
            if(msg.type === GRAPHICS.TYPE_DrawImage) {
                manager.draw_image(msg)
                return redraw()
            }
            if(msg.type === WINDOWS.TYPE_window_close_response) {
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
            <button onClick={()=>toggle_prop("cursor_pos")}>cursor</button>
            <Spacer/>
            <button onClick={()=>screenshot_desktop()}>screenshot</button>
            <button onClick={()=>zoom_in()}>+</button>
            <label>{Math.pow(2,zoom)+"00%"}</label>
            <button onClick={()=>zoom_out()}>-</button>
        </HBox>
        <canvas className={'display-view'} tabIndex={0} style={{
        border: '1px solid black',
        cursor:"none",
    }} width={500} height={500} ref={canvas}
                   onMouseDown={mouse_down}
                   onMouseMove={mouse_move}
                   onMouseUp={mouse_up}
                onKeyDown={key_down}
    /></div>
}
