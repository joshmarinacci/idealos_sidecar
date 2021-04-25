import {useEffect, useState} from 'react'
import {useConnected} from './connection.js'
import {GRAPHICS} from 'idealos_schemas/js/graphics.js'

function props_array_string(obj) {
    if(!obj) return ""
    if(typeof obj === 'string') return obj.toString()
    if(typeof obj === 'number') return obj.toString()
    // console.log('trying to render',obj)
    return Object.entries(obj).map(([key,val]) => {
        return <span key={key}><b>{key}</b>:<i>{props_array_string(val)}</i></span>
    })
}

function MessageView({message}) {
    if(message.type) {
        if(message.type === 'DRAW_PIXEL') return ""
        if(message.type === 'DRAW_RECT') return ""
        if(message.type === 'DRAW_IMAGE') return ""
        if(message.type === 'DEBUG_LOG') return <li className={'log'}>{message.data.map(el => props_array_string(el))}</li>
        if(message.type === 'RESTART_APP_REQUEST') return <li className={'debug-action'}>{props_array_string(message)}</li>
        if(message.type === 'DEBUG_LIST_RESPONSE') return <li className={'debug-action'}>{props_array_string(message)}</li>
        if(message.type === 'OPEN_WINDOW') return <li className={'window'}>{props_array_string(message)}</li>
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
}

export function MessageList({connection}) {
    let [messages, set_messages] = useState([])
    const [filter, set_filter] = useState(FILTERS.ALL)

    if(filter === FILTERS.GFX) {
        messages = messages.filter(msg => {
            if(msg.type === GRAPHICS.TYPE_DrawImage || msg.type === GRAPHICS.TYPE_DrawRect ||
                msg.type === GRAPHICS.TYPE_DrawPixel) return true
            return false
        })
    }

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

    return <div>
        <h3>message list
            <button onClick={()=>update_filter(FILTERS.ALL)}>all</button>
            <button onClick={()=>update_filter(FILTERS.GFX)}>gfx</button>
        </h3>
        <div className={'message-list'}>
            <ul>{messages.map((msg, i) => <MessageView key={i} message={msg}/>)}</ul>
        </div>
    </div>
}