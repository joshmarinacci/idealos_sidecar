import {useEffect, useState} from 'react'

export function AppList({connection}) {
    let [apps, set_apps] = useState([])
    useEffect(() => {
        connection.on("apps", (apps) => {
            console.log("got apps response",apps)
            set_apps(apps)
        })
    }, [connection])

    useEffect(() => {
        let hand = () => {
            if(!connection.isConnected()) {
                set_apps([])
            }
        }
        connection.on('connect', hand)
        connection.on('disconnect', hand)
        return () => {
            connection.off('connect',hand)
            connection.off('disconnect',hand)
        }
    }, [connection])


    return <ul>
        {apps.map(app => {
            return <li key={app.id}>{app.name}
                <button onClick={()=>{
                    connection.request_restart(app.id)
                }}>restart</button>
            </li>
        })}
    </ul>
}