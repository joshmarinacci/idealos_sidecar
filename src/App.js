import './App.css'
import {Connection} from './connection.js'
import {MessageList} from './messageview.js'
import {ConnectStatus} from './connectionview.js'
import {AppList} from './appsview.js'
import {useEffect, useRef} from 'react'

let condo = new Connection()

function DisplayView(props) {
    let canvas = useRef()
    useEffect(()=>{
        if(canvas.current) {
            let can = canvas.current
            let c = can.getContext('2d')
            c.fillStyle = 'white'
            c.fillRect(0,0,can.width,can.height)
            c.fillStyle = 'red'
            c.fillRect(0,0,100,100)
        }
    })
    return <canvas className={'display-view'} style={{
        border:'1px solid black'
    }} width={400} height={300} ref={canvas}/>
}

function App() {
    return <div className={'mainapp'}>
        <ConnectStatus connection={condo}/>
        <AppList connection={condo}/>
        <DisplayView connection={condo}/>
        <MessageList connection={condo}/>
    </div>
}

export default App;
