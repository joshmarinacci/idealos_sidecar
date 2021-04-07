import {useEffect, useState} from 'react'

export function AppList({connection}) {
    let [apps, set_apps] = useState([])
    useEffect(() => {
        console.log("===== refreshing the app")
        connection.on("apps", (apps) => set_apps(apps))
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