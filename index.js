const exec = require('child_process').exec;
const parseAPNG = require('./apng/parser').parseAPNG;
const Player = require('./apng/player').Player;
const vfs = require('vinyl-fs');
const through = require('through2');
const Canvas = require('canvas'),
    Image = Canvas.Image;

// Credits:
// davidmz: https://github.com/davidmz/apng-js
// Scott Wu: https://scwu.io/blog/2015/09/11/Rendering-Canvas-to-mp4-using-nodejs/
// Reddit: https://www.reddit.com/r/Telegram/comments/54j7ah/gif_quality_and_download/
// FFMPEG: https://trac.ffmpeg.org/wiki/Encode/H.264
//         https://trac.ffmpeg.org/wiki/Slideshow

const fps = 30;
const crf = 20;
const backgroundColor = "#FFFFFF";
const frameInterval = 1000 / fps;

function convertAPNG2MP4() {
    const onAPNGChunk = function onAPNGChunk(f, enc, flush) {
        var apng = parseAPNG(f.contents);
        if (apng instanceof Error) console.info('ERROR in ' + f.basename);


        // Prepare all graphical information

        const commandStr = `"ffmpeg/bin/ffmpeg" -y -f image2pipe -vcodec png -r ${fps} -i - -pix_fmt yuv420p -vcodec libx264 -preset veryslow -crf ${crf} -movflags +faststart -r ${fps} ${f.basename}.mp4`;
        const expectedFrames = Math.round(apng.playTime / frameInterval) * apng.numPlays; // get expected total frames from animaion        
        const recorder = exec(commandStr,
            function(error, stdout, stderr) {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                //console.log(`stdout: ${stdout}`); // prints ffmpeg output
                //console.log(`stderr: ${stderr}`); // prints ffmpeg output
            });
        console.log(expectedFrames + ' frames APNG:', commandStr);

        canvas = new Canvas(apng.width, apng.height);
        ctx = canvas.getContext('2d');

        // use fill rect over clear rect
        ctx.clearRect = function(left = 0, top = 0, width = 0, height = 0) {
            ctx.save();
            ctx.fillStyle = backgroundColor; // feel free to fill with custom color ~
            ctx.fillRect(left, top, width, height);
            ctx.restore();
        }

        // force render first frame
        var firstFrame = apng.frames[0];
        firstFrame.imageElement = new Image;
        firstFrame.imageElement.src = firstFrame.imageData;

        // render frame 1 -> end
        var player = new Player(apng, ctx, false);
        firstFrame.startOffset = apng.frames.reduce(function(startOffset, frame, i, frames) {
            var frameNum = (i + 1) % frames.length; // frame 0 is the fallback image unsupported browser would use, so start with frame 1 and put 0 at the back.
            var f = frames[frameNum];
            var url;
            var data;

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
        callback();
    };

    return through.obj(onAPNGChunk, onLastChunk);
}

// Workflow
var pngStream = vfs.src('./*.png')
    .pipe(convertAPNG2MP4())
    .on('data', function() {}) // consume the stream...
    .once('end', function endRecord() {
        console.log("Wait for FFMPEG write up... the program will close automatically when it's done");
    });