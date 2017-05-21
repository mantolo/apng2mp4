const { EventEmitter } = require('events');
const requestAnimationFrame = require('raf');
const perfNow = require('performance-now');

class Player extends EventEmitter {
    /**
     * @param {APNG} apng
     * @param {CanvasRenderingContext2D} context
     * @param {boolean} autoPlay
     */
    constructor(apng, context, autoPlay) {
        super();
        this.context = context;
        /** @type {number} */
        this.playbackRate = 1.0;

        /** @type {APNG} */
        this._apng = apng;
        /** @type {Frame} */
        this._prevFrame;
        /** @type {ImageData} */
        this._prevFrameData;
        /** @type {number} */
        this._currentFrameNumber = 0;

        /** @type {boolean} */
        this._ended = false;
        /** @type {boolean} */
        this._paused = true;
        /** @type {number} */
        this._numPlays = 0;
        this.stop();
        if (autoPlay) {
            this.play();
        }
    }

    /**
     *
     * @return {number}
     */
    get currentFrameNumber() {
        return this._currentFrameNumber;
    }

    /**
     *
     * @return {Frame}
     */
    get currentFrame() {
        return this._apng.frames[this._currentFrameNumber];
    }

    renderNextFrame() {
        this._currentFrameNumber = (this._currentFrameNumber + 1) % this._apng.frames.length;
        if (this._currentFrameNumber === this._apng.frames.length - 1) {
            this._numPlays++;
            if (this._apng.numPlays !== 0 && this._numPlays >= this._apng.numPlays) {
                this._ended = true;
                this._paused = true;
            }
        }

        if (this._prevFrame && this._prevFrame.disposeOp == 1) {
            this.context.clearRect(this._prevFrame.left, this._prevFrame.top, this._prevFrame.width, this._prevFrame.height);
        } else if (this._prevFrame && this._prevFrame.disposeOp == 2) {
            this.context.putImageData(this._prevFrameData, this._prevFrame.left, this._prevFrame.top);
        }

        const frame = this.currentFrame;
        this._prevFrame = frame;
        this._prevFrameData = null;
        if (frame.disposeOp == 2) {
            this._prevFrameData = this.context.getImageData(frame.left, frame.top, frame.width, frame.height);
        }
        if (frame.blendOp == 0) {
            this.context.clearRect(frame.left, frame.top, frame.width, frame.height);
        }

        this.context.drawImage(frame.imageElement, frame.left, frame.top);
    }

    // playback

    get paused() { return this._paused; }

    get ended() { return this._ended; }

    onTick() {}

    play() {
        this.emit('play');

        if (this._ended) {
            this.stop();
        }
        this._paused = false;

        let nextRenderTime = perfNow() + this.currentFrame.delay / this.playbackRate; //performance.now() + this.currentFrame.delay / this.playbackRate;
        const tick = now => {
            if (this._ended || this._paused) {
                return;
            }
            if (now >= nextRenderTime) {
                while (now - nextRenderTime >= this._apng.playTime / this.playbackRate) {
                    nextRenderTime += this._apng.playTime / this.playbackRate;
                    this._numPlays++;
                }
                do {
                    this.renderNextFrame();
                    nextRenderTime += this.currentFrame.delay / this.playbackRate;
                } while (!this._ended && now > nextRenderTime);
            }
            if (this.onTick) this.onTick(perfNow());
            if (this._ended) {
                this.emit('end');
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    pause() {
        if (!this._paused) {
            this.emit('pause');
            this._paused = true;
        }
    }

    stop() {
        this.emit('stop');
        this._numPlays = 0;
        this._ended = false;
        this._paused = true;
        // render first frame
        this._currentFrameNumber = -1;
        this.context.clearRect(0, 0, this._apng.width, this._apng.height);
        this.renderNextFrame();
    }
}

module.exports = {
    Player
};