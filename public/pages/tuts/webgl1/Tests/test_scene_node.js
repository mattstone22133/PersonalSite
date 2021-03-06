import * as EmeraldUtils from "../shared_resources/EmeraldUtils/emerald-opengl-utils.js";
import {UnitCube3D, texturedCubeFactory, coloredCubeFactory} from "../shared_resources/EmeraldUtils/emerald_easy_shapes.js";
import * as key from "../shared_resources/EmeraldUtils/browser_key_codes.js";
import {Camera} from "../shared_resources/EmeraldUtils/emerald-opengl-utils.js";
import {vec2, vec3, vec4, mat4, quat} from "../shared_resources/gl-matrix_esm/index.js";
import {RenderBox3D, GlyphRenderer} from "../shared_resources/EmeraldUtils/BitmapFontRendering.js"
import * as BMF from "../shared_resources/EmeraldUtils/BitmapFontRendering.js"
import { Montserrat_BMF } from "../shared_resources/EmeraldUtils/Montserrat_BitmapFontConfig.js";
import { Piano, Scale } from "../shared_resources/EmeraldUtils/music_tools.js";
import * as Music from "../shared_resources/EmeraldUtils/music_tools.js";
import {isSafari} from "../shared_resources/EmeraldUtils/browser_key_codes.js";
import {SceneNode} from "../shared_resources/EmeraldUtils/3d_utils.js";
import * as util3d from "../shared_resources/EmeraldUtils/3d_utils.js";



/////////////////////////////////////////////////////////////////////
// scene node examples
////////////////////////////////////////////////////////////////////
class DemoSceneNode extends SceneNode
{
    constructor(gl, color)
    {
        super();

        this.gl = gl;
        this.color = color;
        this.cube = coloredCubeFactory(gl);
    }

    render(projectionMat, viewMat)
    {
        let modelMat = this.getWorldMat();
        this.cube.updateShader(modelMat, viewMat, projectionMat, this.color);
        this.cube.bindBuffers();
        this.cube.render(this.gl);
    }
}

/** Factory function for demo scene */
function functionCreateTestHierarchy(gl)
{
    let parent = new DemoSceneNode(gl, vec3.fromValues(1,0,0));
    let child = new DemoSceneNode(gl, vec3.fromValues(0,1,0));
    let grandChild = new DemoSceneNode(gl, vec3.fromValues(0,0,1));

    child.setParent(parent);
    grandChild.setParent(child);

    
    parent.setLocalRotation(quat.setAxisAngle(quat.create(), vec3.fromValues(0,0,1), 45 * (3.1415/180)));
    
    child.setLocalPosition(vec3.fromValues(0, 1, 0));

    grandChild.setLocalPosition(vec3.fromValues(1,0,0));

    return {parent: parent, child:child, grandChild:grandChild};

}


//////////////////////////////////////////////////////
//module level statics
//////////////////////////////////////////////////////
var game = null;

//////////////////////////////////////////////////////
// Shaders
//////////////////////////////////////////////////////

//////////////////////////////////////////////////////
// Base Game Class
//////////////////////////////////////////////////////
class Game
{
    constructor(glCanvasId = "#glCanvas")
    {
        this.glCanvas = document.querySelector(glCanvasId);
        this.gl = this.glCanvas.getContext("webgl");
        this.prevFrameTimestampSec = 0;

        this.inputMonitor = new key.InputMonitor();
        
        this.boundGameLoop = this.gameLoop.bind(this);
        
        // this.buffers = this._createBuffers(this.gl);
        // this.shaders = this._createShaders(this.gl);
        this.textures = this._createTextures(this.gl);
        
        ///////////////////////////////
        //custom game code
        this.coloredCube = coloredCubeFactory(this.gl);
        this.camera = new Camera(vec3.fromValues(0,0,1), vec3.fromValues(0,0,-1));

        this.lineRenderer = new EmeraldUtils.LineRenderer(this.gl);

        this.camera.enableOrthoMode = true;
        this.orthoCameraHeight = 10;
        this.zoomSpeed = 1;

        this.bRenderLineTrace = false;
        this.bStopTicks;

        let nodeData = functionCreateTestHierarchy(this.gl);
        this.parentNode = nodeData.parent;
        this.childNode = nodeData.child;
        this.grandChildNode = nodeData.grandChild;

        this.font = this.bitmapFont = new Montserrat_BMF(this.gl, "../shared_resources/Textures/Fonts/Montserrat_ss_alpha_1024x1024_wb.png");
        this.text_instructions1 = new BMF.BitmapTextblock3D(this.gl, this.font, "press 1,2,3 to select target (for local xform updates)");
        this.text_instructions1.xform.pos = vec3.fromValues(0,4.5,0);
        this.text_instructions1.xform.scale = vec3.fromValues(10,10,10);

        this.text_instructions2 = new BMF.BitmapTextblock3D(this.gl, this.font, "press s=scale, p=position, r=rotation");
        this.text_instructions2.xform.pos = vec3.fromValues(0,4,0);
        this.text_instructions2.xform.scale = vec3.fromValues(10,10,10);

        this.text_instructions3 = new BMF.BitmapTextblock3D(this.gl, this.font, "press x, y, or z to change manipulated value");
        this.text_instructions3.xform.pos = vec3.fromValues(0,3.5,0);
        this.text_instructions3.xform.scale = vec3.fromValues(10,10,10);

        this.text_instructions4 = new BMF.BitmapTextblock3D(this.gl, this.font, "q=decrease, e=increase, u=(manipulate uniformly)");
        this.text_instructions4.xform.pos = vec3.fromValues(0,3,0);
        this.text_instructions4.xform.scale = vec3.fromValues(10,10,10);

        //manipulation state
        this.bUniformManipulation = false;
        this.targetXYZ = "x";
        this.targetManipulator = "pos";
        this.targetObject = this.parentNode;

        //////////////////////////////
        
        this._bindCallbacks();
    }

    // _createBuffers(gl)
    // {
        
    // }

    _createTextures(gl){
        return {
            grass : new EmeraldUtils.Texture(gl, "../shared_resources/Grass2.png"),
            montserratFontWhite : new EmeraldUtils.Texture(gl, "../shared_resources/Montserrat_ss_alpha_white_power2.png"),
            montserratFontBlack : new EmeraldUtils.Texture(gl, "../shared_resources/Montserrat_ss_alpha_black_power2.png"),
            montserratFont : new EmeraldUtils.Texture(gl, "../shared_resources/Textures/Fonts/Montserrat_ss_alpha_1024x1024_wb.png"),
        }
    }

    // _createShaders(gl){
    //     let quad2DShader = EmeraldUtils.initShaderProgram(gl, quad2DVertSrc, quad2DFragSrc);
    //     return {
    //         quad2D : {
    //             program : quad2DShader,
    //             attribs : {
    //                 pos : gl.getAttribLocation(quad2DShader, "vertPos"),
    //                 uv : gl.getAttribLocation(quad2DShader, "texUVCoord"),
    //             },
    //             uniforms : {
    //                 model      : gl.getUniformLocation(quad2DShader, "model"),
    //                 texSampler : gl.getUniformLocation(quad2DShader, "diffuseTexSampler"),
    //             },
    //         },
    //     };
    // }

    _bindCallbacks()
    {
        document.addEventListener('keydown', this.handleKeyDown.bind(this), /*useCapture*/ false);
        document.addEventListener('mousedown', this.handleMouseDown.bind(this), false);
        document.addEventListener('wheel', this.handleMouseWheel.bind(this), false);

        this.glCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
        this.glCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
        this.glCanvas.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
        this.glCanvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), false);
        
        // document.addEventListener('mousedown', this.handleMouseDown.bind(this), false);
        if(EmeraldUtils.supportPointerLock)
        {
            this.glCanvas.addEventListener("click", this.handleCanvasClicked.bind(this), false);
            EmeraldUtils.configureMultiBrowserPointerLock(this.glCanvas);
            EmeraldUtils.addEventListener_pointerlockchange(this.handlePointerLockChange.bind(this));
        }

        window.addEventListener("contextmenu", this.handleContextMenuRequested.bind(this));
    }

    handleContextMenuRequested(e)
    {
        // this can be used to prevent the right click menu from popping up
        // but calling e.preventDefault(); in touch events prevents upcoming mouses
        // it appears that if touch events cancel the right-click mouse event, then
        // no context menu will appear. Hence no longer needing to handle it here.
    }

    handleKeyDown(event)
    {
        let deltaMovement = vec3.fromValues(0,0,0);

        if(event.keyCode == key.t)
        {
            this.camera.enableOrthoMode = !this.camera.enableOrthoMode;
            this.camera.enableMouseFollow = false;
            vec3.set(this.camera.forward, 0, 0, -1);
            vec3.set(this.camera.up, 0, 1, 0);
            // this.glCanvas.exitPointerLock();
            this.camera._squareBases();
        }
        if(event.keyCode == key.minus_underscore)
        {
            this.updateZoom(1);
        }
        if(event.keyCode == key.equals_plus)
        {
            this.updateZoom(-1);
        }

        if(event.keyCode == key.q || event.keyCode == key.e)
        {
            let delta = event.keyCode == key.q ? -1 : 1;
            if(this.targetObject)
            {
                let manipulating = null;
                let manipVec = vec3.fromValues(0,0,0);
                if(this.bUniformManipulation)
                {
                    manipVec[0] = manipVec[1] = manipVec[2] = delta;
                }
                else
                {
                    //TODO not sure how to char-char in javascript
                    let manipIdx = (this.targetXYZ === "x") ? 0 : ((this.targetXYZ === "y") ? 1 : 2)
                    manipVec[manipIdx] = delta;
                }

                if(this.targetManipulator === "pos")
                {
                    vec3.scale(manipVec, manipVec, 0.25);
                    let localPos = this.targetObject.getLocalPosition(vec3.create());
                    vec3.add(localPos, localPos, manipVec);
                    this.targetObject.setLocalPosition(localPos);
                }
                else if (this.targetManipulator === "scale")
                {
                    vec3.scale(manipVec, manipVec, 0.1);
                    let localScale = this.targetObject.getLocalScale(vec3.create());
                    vec3.add(localScale, localScale, manipVec);
                    this.targetObject.setLocalScale(localScale);
                }
                else if (this.targetManipulator === "rot")
                {
                    if(!this.bUniformManipulation)
                    {
                        let rotDelta = quat.setAxisAngle(quat.create(), manipVec, 15.0 *(3.1415/180));
                        let localRot = this.targetObject.getLocalRotation(quat.create());
                        quat.mul(localRot, localRot, rotDelta);
                        this.targetObject.setLocalRotation(localRot);
                    }
                }
            }
        }
        if(event.keyCode == key.u)
        {
            this.bUniformManipulation = !this.bUniformManipulation;
        }
        if(event.keyCode == key.x)
        {
            this.targetXYZ = "x";
        }
        if(event.keyCode == key.y)
        {
            this.targetXYZ = "y";
        }
        if(event.keyCode == key.z)
        {
            this.targetXYZ = "z";
        }
        if(event.keyCode == key.digit_1)
        {
            this.targetObject = this.parentNode;
        }
        if(event.keyCode == key.digit_2)
        {
            this.targetObject = this.childNode;
        }
        if(event.keyCode == key.digit_3)
        {
            this.targetObject = this.grandChildNode;
        }
        if(event.keyCode == key.s)
        {
            this.targetManipulator = "scale";
        }
        if(event.keyCode == key.p)
        {
            this.targetManipulator = "pos";
        }
        if(event.keyCode == key.r)
        {
            this.targetManipulator = "rot";
        }


        vec3.scale(deltaMovement, deltaMovement, this.camera.speed * this.deltaSec);
        vec3.add(this.camera.position, this.camera.position, deltaMovement);
    }

    handleMouseDown(e)
    {
        this.notifyInputDownEvent(e);
    }

    notifyInputDownEvent(e)
    {
        // canvas click will only happen when click is released
        let elementClicked = document.elementFromPoint(e.clientX, e.clientY);
        if(elementClicked)
        {
            if(elementClicked == this.glCanvas)
            {
                // this.handleCanvasClicked(e);
                if(this.camera.enableOrthoMode)
                {
                    let canvas = this.gl.canvas;
                    let canvasHalfWidth = canvas.clientWidth / 2.0;
                    let canvasHalfHeight = canvas.clientHeight / 2.0;
        
                    //x-y relative to center of canvas; assuming 0 padding
                    let x = (e.clientX - canvas.offsetLeft) - (canvasHalfWidth);
                    let y = -((e.clientY - canvas.offsetTop) - (canvasHalfHeight));
                    // console.log(x, y);
        
                    let fractionWidth = x / canvasHalfWidth;
                    let fractionHeight = y / canvasHalfHeight;
                    
                    let aspect = canvas.clientWidth / canvas.clientHeight;
                    let orthoHalfHeight = this.orthoCameraHeight / 2.0
                    let orthoHalfWidth = (aspect * this.orthoCameraHeight) / 2.0; 
        
                    let numCameraUpUnits = fractionHeight * orthoHalfHeight;
                    let numCameraRightUnits = fractionWidth * orthoHalfWidth;
        
                    let rayStart = vec3.clone(this.camera.position);
        
                    { //calculate start point
                        let scaledCamUp = vec3.clone(this.camera.up);
                        let scaledCamRight = vec3.clone(this.camera.right);
            
                        vec3.scale(scaledCamUp, scaledCamUp, numCameraUpUnits);
                        vec3.scale(scaledCamRight, scaledCamRight, numCameraRightUnits);
            
                        vec3.add(rayStart, rayStart, scaledCamUp);
                        vec3.add(rayStart, rayStart, scaledCamRight);
                    }
        
                    let rayEnd = vec3.clone(rayStart);
                    vec3.add(rayEnd, rayEnd, this.camera.forward);
                    
                    this.rayStart = rayStart;
                    this.rayEnd = rayEnd;
                }
            }

            //immediately do ray test; don't wait as we may have chords
            if(this.rayEnd && this.rayStart)
            {
                let rayDir = vec3.sub(vec3.create(), this.rayEnd, this.rayStart);
                vec3.normalize(rayDir, rayDir);
                // let clickedKey = this.piano.clickTest(this.rayStart, rayDir);
                // if(clickedKey)
                // {
                //     this.rayEnd = null;
                //     this.rayStart = null;
                // }
            }
        }
    }

    updateZoom(normalizedY)
    {
        this.orthoCameraHeight = this.orthoCameraHeight + normalizedY * this.zoomSpeed;
    }

    handleMouseWheel(e)
    {
        //wheel event is not supported by safari
        let normalizedY = e.deltaY / Math.abs(e.deltaY);
        this.updateZoom(normalizedY);
    }

    handleTouchEnd(event)
    {
        event.preventDefault(); //stop mouse event

        for(const touch of event.changedTouches)
        {
            // console.log("released touch", touch.identifier);
        }
    }

    handleTouchStart(event)
    {
        event.preventDefault(); //stop mouse event

        for(const touch of event.changedTouches)
        {   
            // console.log("added touch", touch.identifier);
            this.notifyInputDownEvent(touch);
        }

    }
    handleTouchMove(event)
    {
        event.preventDefault(); //stop mouse event
    }
    handleTouchCancel(event)
    {
        event.preventDefault(); //stop mouse event
    }


    handleCanvasClicked( e )
    {
        if(this.camera.enableOrthoMode)
        {
            //
        }
        else
        {
            //not using ortho... do pointerlock for perspective camera
            this.glCanvas.requestPointerLock();
        }
    }

    handlePointerLockChange()
    {
        if(!this.camera.enableOrthoMode)
        {
            this.camera.enableMouseFollow = EmeraldUtils.isElementPointerLocked(this.glCanvas);
        }
    }

    run()
    {
        requestAnimationFrame(this.boundGameLoop);
    }

    gameLoop(nowMS)
    {
        let gl = this.gl;

        let nowTimeSec = (nowMS * 0.001);
        let deltaSec = nowTimeSec - this.prevFrameTimestampSec;
        this.deltaSec = deltaSec;
        this.prevFrameTimestampSec = nowTimeSec;
        
        gl.enable(gl.DEPTH_TEST); 
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.clearColor(0.0, 0.0, 0.0, 1);
        gl.clearDepth(1.0); //value gl.clear() write to depth buffer; is this default value?
        gl.depthFunc(gl.LEQUAL);  //maybe default,?
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        /////////////////////////////////////
        // TICK
        /////////////////////////////////////
        this.camera.tick(this.deltaSec);

        /////////////////////////////////////
        // RENDER
        /////////////////////////////////////

        //some of these may be appropriate for camera fields
        let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

        let perspectiveMat = null;
        if(this.camera.enableOrthoMode) { perspectiveMat = this.camera.getOrtho(aspect * this.orthoCameraHeight, this.orthoCameraHeight);}
        else                            { perspectiveMat = this.camera.getPerspective(aspect); }

        let viewMat = this.camera.getView();


        if(this.bRenderLineTrace && this.rayStart && this.rayEnd)
        {
            this.lineRenderer.renderLine(this.rayStart, this.rayEnd, vec3.fromValues(1,0,0), viewMat, perspectiveMat);
        }

        if(this.bRenderLineTrace && this.rayEnd)
        {
            let coloredCubeModel = mat4.create();
            mat4.translate(coloredCubeModel, coloredCubeModel, this.rayEnd);
            mat4.scale(coloredCubeModel, coloredCubeModel, vec3.fromValues(0.1, 0.1, 0.1));
            let cubeColor = vec3.fromValues(1,0,0);
            this.coloredCube.bindBuffers();
            this.coloredCube.updateShader(coloredCubeModel, viewMat, perspectiveMat, cubeColor);
            this.coloredCube.render();
        }

        this.text_instructions1.render(perspectiveMat, viewMat);
        this.text_instructions2.render(perspectiveMat, viewMat);
        this.text_instructions3.render(perspectiveMat, viewMat);
        this.text_instructions4.render(perspectiveMat, viewMat);


        this.parentNode.render(perspectiveMat, viewMat);
        this.childNode.render(perspectiveMat, viewMat);
        this.grandChildNode.render(perspectiveMat, viewMat);

        if(!this.bStopTicks)
        {
            requestAnimationFrame(this.boundGameLoop);
        }
    }
}

function main()
{
    game = new Game();
    game.run();
    
}

main()