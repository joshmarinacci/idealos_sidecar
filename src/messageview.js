import {useEffect, useState} from 'react'

function props_array_string(obj) {
    if(typeof obj === 'string') return obj.toString()
    if(typeof obj === 'number') return obj.toString()
    return Object.entries(obj).map(([key,val]) => {
        return <span key={key}><b>{key}</b>:<i>{props_array_string(val)}</i></span>
    })
}

function MessageView({message}) {
    if(message.type) {
        if(message.type === 'DEBUG_LOG') return <li className={'log'}>{message.data.map(el => props_array_string(el))}</li>
        if(message.type === 'RESTART_APP_REQUEST') return <li className={'debug-action'}>{props_array_string(message)}</li>
        if(message.type === 'DEBUG_LIST_RESPONSE') return <li className={'debug-action'}>{props_array_string(message)}</li>
        if(message.type === 'OPEN_WINDOW') return <li className={'window'}>{props_array_string(message)}</li>
        console.log("message",message)
    }
    return <li>
        <i>type</i> <b>{message.type}</b>
        <i>data</i> <b>{JSON.stringify(message)}</b>
    </li>
}

export function MessageList({connection}) {
    const [messages, set_messages] = useState([])
    useEffect(() => {
        let handler = (msg) => set_messages(connection.messages)
        connection.on("message", handler)
        return () => connection.off('message', handler)
    }, [connection])
    return <div>
        <h3>message list</h3>
        <div className={'message-list'}>
            <ul>{messages.map((msg, i) => <MessageView key={i} message={msg}/>)}</ul>
        </div>
    </div>
}