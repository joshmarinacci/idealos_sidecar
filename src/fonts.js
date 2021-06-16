export class JoshFont {
    constructor(info) {
        this.info = info
    }

/*    draw_text(app,x,y,text,color,win) {
        let dx = 0
        for(let i=0; i<text.length; i++) {
            let cp = text.codePointAt(i)
            let g = this.find_glyph_by_id(cp)
            let bitmap = this.get_bitmap_for_glyph(g)
            // console.log(i,text,text[i],cp)
            app.send(GRAPHICS.MAKE_DrawImage({
                x:x+dx-g.left,
                y:y-g.baseline+g.height,
                width:g.width,
                height:g.height,
                pixels:bitmap,
                window:win._winid,
            }))
            dx += (g.width-g.left-g.right)
        }
    }*/
    // measure_text(app,text) {
    //     // console.log("measuring text",text)
    //     let dx = 0
    //     let my = 0
    //     for(let i=0; i<text.length; i++) {
    //         let cp = text.codePointAt(i)
    //         // console.log(i,text,text[i],cp)
    //         let g = this.find_glyph_by_id(cp)
    //         dx += g.width - g.left - g.right
    //         my = Math.max(my,g.height)
    //     }
    //     return {
    //         width:dx,
    //         height:my,
    //     }
    // }

    find_glyph_by_id(id) {
        // console.log("looking up glpyh for ",id)
        // console.log(this.info.glyphs)
        return this.info.glyphs.find(g => g.id === id)
    }

    get_bitmap_for_glyph(a_glyph) {
        if(a_glyph.image) return a_glyph.image
        // console.log("generating image for ",a_glyph.name)
        a_glyph.image = new Array(a_glyph.width*a_glyph.height*4)
        a_glyph.image.fill(0)
        for(let i=0; i<a_glyph.width; i++) {
            for(let j=0; j<a_glyph.height; j++) {
                let c = a_glyph.data[j*a_glyph.width+i]
                let n = (j*a_glyph.width + i)*4
                // a_glyph.image[n + 0] = 0
                // a_glyph.image[n + 1] = 0
                // a_glyph.image[n + 2] = 0
                if(c) {
                    a_glyph.image[n + 3] = 255
                } else {
                    a_glyph.image[n + 3] = 0
                }
            }
        }
        return a_glyph.image
    }

    get_canvas_for_glyph(a_glyph) {
        if(a_glyph.canvas) return a_glyph.canvas
        a_glyph.canvas = document.createElement('canvas')
        a_glyph.canvas.width = a_glyph.width
        a_glyph.canvas.height = a_glyph.height
        let ctx = a_glyph.canvas.getContext('2d')
        let id = ctx.createImageData(a_glyph.width, a_glyph.height)
        let arr = this.get_bitmap_for_glyph(a_glyph)
        for(let i=0; i<arr.length; i++) {
            id.data[i] = arr[i]
        }
        ctx.putImageData(id,0,0)
        return a_glyph.canvas
    }
}


export function make_load_font_request(name) {
    return {
        type:"request-font",
        name:name,
    }
}