import {useEffect, useState} from 'react'

export function AppList({connection}) {
    let [apps, set_apps] = useState([])
    useEffect(() => {
        connection.on("apps", (apps) => set_apps(apps))
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
        <button onClick={()=>connection.request_apps_list()}>refresh</button>
        {apps.map(app => {
            return <li key={app.id}>{app.name}
                <button onClick={()=>connection.request_stop(app.id)}>stop</button>
                <button onClick={()=>connection.request_start(app.id)}>start</button>
                {/*<button onClick={()=>connection.request_restart(app.id)}>restart</button>*/}
            </li>
        })}
    </ul>
}