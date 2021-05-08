import {useEffect, useState} from 'react'
import {GRAPHICS} from 'idealos_schemas/js/graphics.js'
import {WINDOWS} from 'idealos_schemas/js/windows.js'
import {DEBUG} from 'idealos_schemas/js/debug.js'
import {GENERAL} from 'idealos_schemas/js/general.js'
import {INPUT} from 'idealos_schemas/js/input.js'

function props_array_string(obj,depth) {
    if(!depth) depth = 4
    if(depth <= 1) return "too deep"
    if(!obj) return ""
    if(typeof obj === 'string') return obj.toString()
    if(typeof obj === 'number') return obj.toString()
    // console.log('trying to render',obj)
    let arr = Object.entries(obj)
    return arr.map(([key,val]) => {
        return <span key={key}><b>{key}</b>:<i>{props_array_string(val,depth-1)}</i>&nbsp;</span>
    })
}

function MessageView({message, repaint, set_repaint}) {
    const expand = (e) => {
        message._open = true
        set_repaint(repaint+1)
    }
    if(message._open) {
        if (message.type) {
            if (message.type === GRAPHICS.TYPE_DrawPixel) return <li>px {message.x},{message.y}, {message.color}</li>
            if (message.type === GRAPHICS.TYPE_DrawRect) return ""
            if (message.type === GRAPHICS.TYPE_DrawImage) return ""
            if (message.type === GENERAL.TYPE_Log) return <li
                className={'log'}>{message.data.map(el => props_array_string(el))}</li>

            if (message.type === DEBUG.TYPE_RestartApp) return <li
                className={'debug-action'}>{props_array_string(message)}</li>
            if (message.type === DEBUG.TYPE_StopApp) return <li
                className={'debug-action'}>{props_array_string(message)}</li>
            if (message.type === DEBUG.TYPE_StartApp) return <li
                className={'debug-action'}>{props_array_string(message)}</li>
            if (message.type === DEBUG.TYPE_ListAppsResponse) return <li
                className={'debug-action'}>{props_array_string(message, 5)}</li>

            if (message.type === WINDOWS.TYPE_WindowOpen) return <li
                className={'window'}>{props_array_string(message)}</li>
            if (message.type === WINDOWS.TYPE_WindowOpenDisplay) return <li
                className={'window'}>{props_array_string(message)}</li>
            if (message.type === WINDOWS.TYPE_window_list) return <li
                className={'window'}>{props_array_string(message)}</li>
            if (message.type === WINDOWS.TYPE_window_close_request) return <li
                className={'window'}>{props_array_string(message)}</li>
            if (message.type === WINDOWS.TYPE_window_close_response) return <li
                className={'window'}>{props_array_string(message)}</li>
            // console.log("message",message)
        }
    } else {
        return <li><b onClick={expand}>{message.type}</b></li>
    }
    return <li>
        <i>type</i> <b>{message.type}</b>
        <i>data</i> <b>{JSON.stringify(message)}</b>
    </li>
}

const FILTERS= {
    ALL:'ALL',
    GFX:'GFX',
    WINDOW:'WINDOW',
    APP:'APP',
    INPUT:'INPUT',
    APPLOG: 'APPLOG'
}

function is_window_type(msg) {
    return (msg.type === WINDOWS.TYPE_WindowOpenDisplay ||
        msg.type === WINDOWS.TYPE_WindowOpenResponse ||
        msg.type === WINDOWS.TYPE_window_list ||
        msg.type === WINDOWS.TYPE_window_refresh_request ||
        msg.type === WINDOWS.TYPE_window_refresh_response ||
        msg.type === WINDOWS.TYPE_WindowOpen ||
        msg.type === WINDOWS.TYPE_window_close_request ||
        msg.type === WINDOWS.TYPE_window_close_response ||
        msg.type === WINDOWS.TYPE_create_child_window_display ||
        msg.type === WINDOWS.TYPE_close_child_window_display ||
        msg.type === WINDOWS.TYPE_WindowSetPosition
)
}

function is_graphics_type(msg) {
    return (
        msg.type === GRAPHICS.TYPE_DrawImage ||
        msg.type === GRAPHICS.TYPE_DrawRect ||
        msg.type === GRAPHICS.TYPE_DrawPixel
    )
}

function is_app_type(msg) {
    return (
        msg.type === DEBUG.TYPE_ListAppsResponse ||
        msg.type === DEBUG.TYPE_ListAppsRequest ||
        msg.type === DEBUG.TYPE_StartApp ||
        msg.type === DEBUG.TYPE_StartAppByName ||
        msg.type === DEBUG.TYPE_StopApp ||
        msg.type === DEBUG.TYPE_AppStarted ||
        msg.type === DEBUG.TYPE_AppStopped
    )
}

function is_input_type(msg) {
    return (
        msg.type === INPUT.TYPE_Action ||
        // msg.type === INPUT.TYPE_MouseMove ||
        msg.type === INPUT.TYPE_MouseDown ||
        msg.type === INPUT.TYPE_MouseUp ||
        msg.type === INPUT.TYPE_KeyboardDown ||
        msg.type === INPUT.TYPE_KeyboardUp
    )
}

function is_applog_type(msg) {
    return (msg.type === GENERAL.TYPE_Log)
}

export function MessageList({connection}) {
    let [messages, set_messages] = useState([])
    let [repaint, set_repaint] = useState(0)
    const [filter, set_filter] = useState(FILTERS.ALL)

    if(filter === FILTERS.GFX) messages = messages.filter(is_graphics_type)
    if(filter === FILTERS.WINDOW) messages = messages.filter(is_window_type)
    if(filter === FILTERS.APP) messages = messages.filter(is_app_type)
    if(filter === FILTERS.INPUT) messages = messages.filter(is_input_type)
    if(filter === FILTERS.APPLOG) messages = messages.filter(is_applog_type)

    const update_messages =()=> {
        set_messages(connection.messages.slice())
    }
    const update_filter = (filter) =>{
        set_filter(filter)
        update_messages(filter)
    }
    useEffect(() => {
        connection.on("message", update_messages)
        return () => connection.off('message', update_messages)
    },[connection])

    return <div className={'message-view'}>
        <h3>message list
            <button onClick={()=>update_filter(FILTERS.ALL)}>all</button>
            <button onClick={()=>update_filter(FILTERS.APP)}>app</button>
            <button onClick={()=>update_filter(FILTERS.WINDOW)}>win</button>
            <button onClick={()=>update_filter(FILTERS.GFX)}>gfx</button>
            <button onClick={()=>update_filter(FILTERS.INPUT)}>input</button>
            <button onClick={()=>update_filter(FILTERS.APPLOG)}>applog</button>
        </h3>
        <div className={'message-list'}>
            <ul>{messages.map((msg, i) => <MessageView key={i} message={msg} repaint={repaint} set_repaint={set_repaint}/>)}</ul>
        </div>
    </div>
}
