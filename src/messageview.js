import {useEffect, useState} from 'react'
import {useConnected} from './connection.js'
import {GRAPHICS} from 'idealos_schemas/js/graphics.js'
import {WINDOWS} from 'idealos_schemas/js/windows.js'
import {DEBUG} from 'idealos_schemas/js/debug.js'
import {GENERAL} from 'idealos_schemas/js/general.js'

function props_array_string(obj) {
    if(!obj) return ""
    if(typeof obj === 'string') return obj.toString()
    if(typeof obj === 'number') return obj.toString()
    // console.log('trying to render',obj)
    let arr = Object.entries(obj)
    if(arr.length > 5) {
        return <span>too long</span>
    }
    return arr.map(([key,val]) => {
        return <span key={key}><b>{key}</b>:<i>{props_array_string(val)}</i></span>
    })
}

function MessageView({message}) {
    if(message.type) {
        if(message.type === GRAPHICS.TYPE_DrawPixel) return <li>px {message.x},{message.y}, {message.color}</li>
        if(message.type === GRAPHICS.TYPE_DrawRect) return ""
        if(message.type === GRAPHICS.TYPE_DrawImage) return ""
        if(message.type === GENERAL.TYPE_Log) return <li className={'log'}>{message.data.map(el => props_array_string(el))}</li>

        if(message.type === DEBUG.TYPE_RestartApp) return <li className={'debug-action'}>{props_array_string(message)}</li>
        if(message.type === DEBUG.TYPE_StopApp) return <li className={'debug-action'}>{props_array_string(message)}</li>
        if(message.type === DEBUG.TYPE_StartApp) return <li className={'debug-action'}>{props_array_string(message)}</li>
        if(message.type === DEBUG.TYPE_ListAppsResponse) return <li className={'debug-action'}>{props_array_string(message)}</li>

        if(message.type === WINDOWS.TYPE_WindowOpen) return <li className={'window'}>{props_array_string(message)}</li>
        if(message.type === WINDOWS.TYPE_WindowOpenDisplay) return <li className={'window'}>{props_array_string(message)}</li>
        if(message.type === WINDOWS.TYPE_window_list) return <li className={'window'}>{props_array_string(message)}</li>
        if(message.type === WINDOWS.TYPE_window_close) return <li className={'window'}>{props_array_string(message)}</li>
        // console.log("message",message)
    }
    return <li>
        <i>type</i> <b>{message.type}</b>
        <i>data</i> <b>{JSON.stringify(message)}</b>
    </li>
}

const FILTERS= {
    ALL:'ALL',
    GFX:'GFX',
    WINDOW:'WINDOW'
}

function is_window_type(msg) {
    return (msg.type === WINDOWS.TYPE_WindowOpenDisplay ||
        msg.type === WINDOWS.TYPE_WindowOpenResponse ||
        msg.type === WINDOWS.TYPE_window_list ||
        msg.type === WINDOWS.TYPE_window_refresh_request ||
        msg.type === WINDOWS.TYPE_window_refresh_response ||
        msg.type === WINDOWS.TYPE_WindowOpen ||
        msg.type === WINDOWS.TYPE_window_close
    )
}

function is_graphics_type(msg) {
    return (
        msg.type === GRAPHICS.TYPE_DrawImage ||
        msg.type === GRAPHICS.TYPE_DrawRect ||
        msg.type === GRAPHICS.TYPE_DrawPixel
    )
}

export function MessageList({connection}) {
    let [messages, set_messages] = useState([])
    const [filter, set_filter] = useState(FILTERS.ALL)

    if(filter === FILTERS.GFX) messages = messages.filter(is_graphics_type)
    if(filter === FILTERS.WINDOW) messages = messages.filter(is_window_type)

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
            <button onClick={()=>update_filter(FILTERS.WINDOW)}>win</button>
            <button onClick={()=>update_filter(FILTERS.GFX)}>gfx</button>
        </h3>
        <div className={'message-list'}>
            <ul>{messages.map((msg, i) => <MessageView key={i} message={msg}/>)}</ul>
        </div>
    </div>
}