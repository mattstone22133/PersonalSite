import { mat4, vec3, vec4 } from "../gl-matrix_esm/index.js";
import { SceneNode } from "./3d_utils.js";
import { discard_simpleTexturedQuadShapeShader_fs, simpleTexturedQuadShapeShader_vs, texturedQuadFactory } from "./emerald_easy_shapes.js";
import * as EmeraldUtils from "../EmeraldUtils/emerald-opengl-utils.js";

/** Widget that reacts to being moved by updating its local position to the moved location */
export class DragWidget extends SceneNode
{
    constructor()
    {
        super();
        this.bDragging = false;
        this.trackedTouch = null;
        this.draggingRightBasis = vec3.fromValues(0,0,0);
        this.draggingUpBasis = vec3.fromValues(0,0,0);
        this.startDragClientX = 0;
        this.startDragClientY = 0;
        this.clientToCameraConversionX = 0;
        this.clientToCameraConversionY = 0;
        this.startParentLocalPos = vec3.fromValues(0,0,0);
        this._updatePositionBuffer = vec3.fromValues(0,0,0);
        this._scaledUpBuffer = vec3.fromValues(0,0,0);
        this._scaledRightBuffer = vec3.fromValues(0,0,0);

    }

    v_rayHitTest(rayStart, rayDir){console.log("draggable did not implement hittest virtual", rayStart, rayDir)} //implement this to do hit tests

    notifyInputDownEvent(e, canvas, camera)
    {
        let ray = camera.generateClickedRay(e, canvas);
        if(ray)
        {
            if(this.v_rayHitTest(ray.rayStart, ray.rayDir))
            {
                this.bDragging = true;
                if (e.changedTouches && e.changedTouches.length > 0) { this.trackedTouch = e.changedTouches[0]; }
                vec3.copy(this.draggingRightBasis,camera.right);
                vec3.copy(this.draggingUpBasis, camera.up);
                this.startDragClientX = e.clientX;
                this.startDragClientY = e.clientY;
                // let aspect = canvas.clientWidth / canvas.clientHeight;  //#note clientWidth may not be a great value to read here; scrolling considered?
                
                this.clientToCameraConversion = (camera.orthoHeight) / canvas.clientHeight; 
                // this.clientToCameraConversionY = 2*(camera.orthoHeight)          / canvas.clientHeight; 
                // this.clientToCameraConversionX = 2*(camera.orthoHeight * aspect) / canvas.clientWidth; 
                let topParent = this.getTopParent();
                topParent.getLocalPosition(this.startParentLocalPos);
            }
        }
    }

    notifyInputMoveEvent(e)
    {
        if(this.bDragging)
        {
            if(this.trackedTouch)
            {
                //check to make sure touches match, otherwise return
            }
            
            //convert the drag mouse coordinates to camera coordinates
            let deltaClientX = e.clientX - this.startDragClientX;
            let deltaClientY = e.clientY - this.startDragClientY;
            
            let deltaCamX = deltaClientX * this.clientToCameraConversion;
            let deltaCamY = deltaClientY * this.clientToCameraConversion;
            deltaCamY *= -1;

            //get toplevel parent (that is the local position we're going to transform)
            let topParent = this.getTopParent();

            //adjust the top-level parent's coordinates by the camera right and up vecs
            vec3.copy(this._updatePositionBuffer, this.startParentLocalPos);

            vec3.scale(this._scaledUpBuffer, this.draggingUpBasis, deltaCamY);
            vec3.add(this._updatePositionBuffer, this._updatePositionBuffer, this._scaledUpBuffer);

            vec3.scale(this._scaledRightBuffer, this.draggingRightBasis, deltaCamX);
            vec3.add(this._updatePositionBuffer, this._updatePositionBuffer, this._scaledRightBuffer);

            topParent.setLocalPosition(this._updatePositionBuffer);
        }
    }

    notifyInputUpEvent(e)
    {
        if(this.bDragging)
        {
            if(this.trackedTouch)
            {
                //check to make sure this is the same touch
                if (e.changedTouches && e.changedTouches.length > 0) 
                {
                    for(const touch of event.changedTouches)
                    {
                        if(this.trackedTouch == touch)
                        {
                            this.bDragging = false;
                            break;
                        }
                    }
                }
            }
            else
            {
                this.bDragging = false;
            }
        }
    }
}

export class DragWidgetTextured extends DragWidget
{
    constructor(gl)
    {
        super();
        this.gl = gl;

        this.textures = this._createTextures(this.gl);
        this.texturedQuad = texturedQuadFactory(this.gl, simpleTexturedQuadShapeShader_vs, discard_simpleTexturedQuadShapeShader_fs);
    }

    v_rayHitTest(rayStart, rayDir)
    {
        let inverseXform = this.getInverseWorldMat();

        let transformedRayStart = vec4.fromValues(rayStart[0], rayStart[1], rayStart[2], 1.0); //this is a point so 4th coordinate is a 1
        vec4.transformMat4(transformedRayStart, transformedRayStart, inverseXform);

        let transformedRayDir = vec4.fromValues(rayDir[0], rayDir[1], rayDir[2], 0.0);   //this is a dir, 4th coordinate is 0
        vec4.transformMat4(transformedRayDir, transformedRayDir, inverseXform);

        //the inverse transform will handle scaling etc; so the fast-box-collision test must use the normalized cube units
        //since this is a quad plane, we make a skinny box and use that for hit test (there's no triangle test currentlyk)
        let hit_t = EmeraldUtils.rayTraceFastAABB(-0.5, 0.5, -0.5, 0.5, -0.05, 0.05, transformedRayStart, transformedRayDir);
        if(hit_t)
        {
            return true;
        } 
        return false;
    } 

    render(viewMat, perspectiveMat)
    {
        let quadModelMat = this.getWorldMat();

        this.texturedQuad.bindBuffers();
        this.texturedQuad.bindTexture(this.gl.TEXTURE0, this.textures.depad.glTextureId, this.texturedQuad.shader.uniforms.texSampler);
        this.texturedQuad.updateShader(quadModelMat, viewMat, perspectiveMat);
        this.texturedQuad.render();

    }

    _createTextures(gl)
    {
        return {
            depad : new EmeraldUtils.Texture(gl, "../shared_resources/Textures/Icons/DepadIcon.png"),
        }
    }

}



