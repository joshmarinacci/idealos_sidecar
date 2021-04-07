import {useEffect, useState} from 'react'

function MessageView({message}) {
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
    return <div className={'message-list'}>
        <h3>message list</h3>
        <ul>{messages.map((msg, i) => {
            return <MessageView key={i} message={msg}/>
        })}</ul>
    </div>
}