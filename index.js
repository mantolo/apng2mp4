const exec = require('child_process').exec;
const parseAPNG = require('./apng/parser').parseAPNG;
const Player = require('./apng/player').Player;
const vfs = require('vinyl-fs');
const through = require('through2');
const { createCanvas, Image } = require('canvas');
const path = require('path');

// Credits:
// davidmz: https://github.com/davidmz/apng-js
// Scott Wu: https://scwu.io/blog/2015/09/11/Rendering-Canvas-to-mp4-using-nodejs/
// Reddit: https://www.reddit.com/r/Telegram/comments/54j7ah/gif_quality_and_download/
// FFMPEG: https://trac.ffmpeg.org/wiki/Encode/H.264
//         https://trac.ffmpeg.org/wiki/Slideshow

/**
 * 
    Video must be in .WEBM format, up to 30 FPS.
    Video must be encoded with the VP9 codec.
    Video must have no audio stream.
    One side must be 512 pixels in size – the other side can be 512 pixels or less.
    Duration must not exceed 3 seconds.
    Video must have a transparent layer (this is no longer required).
    Video should be looped for optimal user experience.
    Video size should not exceed 256 KB after encoding.

 */

const fps = 30;
const crf = 40;
const backgroundColor = "#FFFFFF";
const frameInterval = 1000 / fps;

function convertAPNG2MP4() {
    var processCount = 0;
    var proceed = null;

    const checkProceed = function checkProceed() {
        if (proceed && processCount === 0) {
            proceed();
        }
    }

    const onAPNGChunk = function onAPNGChunk(f, enc, flush) {
        var apng = parseAPNG(f.contents);
        if (apng instanceof Error) console.info('ERROR in ' + f.basename);
        processCount++;

        // Prepare all graphical information

        const commandStr = `"${__dirname}/ffmpeg/bin/ffmpeg" -y -f image2pipe -vcodec png -r ${fps} -i - -pix_fmt rgba -vf "scale=w=512:h=512:force_original_aspect_ratio=decrease" -vcodec libvpx-vp9 -crf ${crf} -b:v 0 -r ${fps} ${f.dirname}/${f.basename}.webm`;
        const expectedFrames = Math.round(apng.playTime / frameInterval) /* * apng.numPlays */; // get expected total frames from animaion        
        const recorder = exec(commandStr,
            function(error, stdout, stderr) {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                //console.log(`stdout: ${stdout}`); // prints ffmpeg output
                //console.log(`stderr: ${stderr}`); // prints ffmpeg output
            });

        recorder.once('exit', function(e) {
            processCount--;
            if (e !== 0) {
                console.log(e, f.basename + ' conversion failed');
            } else {
                console.log('=> ' + f.basename + '.webm');
            }
            checkProceed();
        });

        console.log(expectedFrames + ' frames APNG:', commandStr);

        canvas = createCanvas(apng.width, apng.height);
        ctx = canvas.getContext('2d');

        // force render first frame
        var firstFrame = apng.frames[0];
        firstFrame.imageElement = new Image;
        firstFrame.imageElement.src = firstFrame.imageData;

        // render frame 1 -> end
        var player = new Player(apng, ctx, false);
        firstFrame.startOffset = apng.frames.reduce(function(startOffset, frame, i, frames) {
            var frameNum = (i + 1) % frames.length; // frame 0 is the fallback image unsupported browser would use, so start with frame 1 and put 0 at the back.
            var f = frames[frameNum];

            f.startOffset = startOffset + f.delay; // offset is used later for soft-playback 

            if (frameNum !== 0) { // frame 0 would be rendered by constructing Player object, no need to render for it
                var img = new Image;
                img.src = f.imageData;
                f.imageElement = img;
                player.renderNextFrame();
            }

            f.canvasData = canvas.toBuffer(); // save all final canvas buffer

            if (frameNum === 0) {
                player._ended = false;
                player._paused = false;
                player._prevFrame = null;
                player._numPlays = 0;
            }

            return f.startOffset;
        }, 0);

        // Soft play the animation
        let elapsed = 0;
        let bin;
        let frames = apng.frames;
        let frame;
        const binary = "binary";
        for (let i = 0; i < expectedFrames; i++) { // write exact amount of images as expected frames, just map frames into the playback speed.
            elapsed = (i * frameInterval) % apng.playTime;
            for (let j = 1; j <= frames.length; j++) { // remember to start from frame 1
                j = j % frames.length;
                frame = frames[j];
                if (elapsed - frame.startOffset <= 0) break;
            }

            bin = frame.canvasData;
            recorder.stdin.write(bin, binary);
        }
        recorder.stdin.end();
        flush(null, f);
    };

    const onLastChunk = function onLastChunk(callback) {
        proceed = callback;
    };

    return through.obj(onAPNGChunk, onLastChunk);
}

// Workflow
new Promise((resolve) => {
  vfs.src(`${__dirname}/animated-emojis/*/*.png`)
  .pipe(convertAPNG2MP4())
  .on('data', function() {}) // consume the stream...
  .once('end', function endRecord() {
      console.log("Wait for FFMPEG write up... the program will close automatically when it's done");
      resolve();
  });
}); 

