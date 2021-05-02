import {useEffect, useState} from 'react'

function AppToggleButton({app, connection}) {
    const [running, set_running] = useState(app.running)
    let action_label = running?"stop":"start"
    const toggle = () => {
        if(running) {
            connection.request_stop(app.id)
            set_running(false)
        } else {
            connection.request_start(app.id)
            set_running(true)
        }
    }
    return <div>
        <label>{app.name}</label>
        <button onClick={toggle}>{action_label}</button>
    </div>
}

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


    return <ul className={'app-list'}>
        <button onClick={()=>connection.request_apps_list()}>refresh</button>
        {apps.map(app => {
            return <li key={app.id+"_"+app.running}>
                <AppToggleButton app={app} connection={connection}/>
            </li>
        })}
    </ul>
}