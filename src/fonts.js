export class JoshFont {
    constructor(info) {
        this.info = info
    }

    draw_text_to_canvas(ctx,x,y,text,color, bg) {
        if(bg) {
            let w = 0
            let h = 0
            for(let i=0; i<text.length; i++) {
                let cp = text.codePointAt(i)
                let g = this.find_glyph_by_id(cp)
                let ww = (g.width-g.left-g.right)
                w += ww
                h = Math.max(h,g.height)
            }
            ctx.fillStyle = bg
            ctx.fillRect(x,y,w,h)
        }
        let dx = 0
        for(let i=0; i<text.length; i++) {
            let cp = text.codePointAt(i)
            let g = this.find_glyph_by_id(cp)
            let can = this.get_canvas_for_glyph(g)
            ctx.drawImage(can,x+dx,y)
            dx += (g.width-g.left-g.right)
        }
    }
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
