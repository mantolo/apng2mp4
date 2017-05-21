const { Player } = require('./player');


/**
 * @property {number} currFrameNumber
 * @property {Frame} currFrame
 * @property {boolean} paused
 * @property {boolean} ended
 */
class APNG {
    constructor() {
        /** @type {number} */
        this.width = 0;
        /** @type {number} */
        this.height = 0;
        /** @type {number} */
        this.numPlays = 0;
        /** @type {number} */
        this.playTime = 0;
        /** @type {Frame[]} */
        this.frames = [];
    }

    /**
     *
     * @return {Promise.<*>}
     */
    createImages() {
        return Promise.all(this.frames.map(f => f.createImage()));
    }

    /**
     *
     * @param {CanvasRenderingContext2D} context
     * @param {boolean} autoPlay
     * @return {Promise.<Player>}
     */
    getPlayer(context, autoPlay = false) {
        return this.createImages().then(() => new Player(this, context, autoPlay));
    }
}

class Frame {
    constructor() {
        /** @type {number} */
        this.left = 0;
        /** @type {number} */
        this.top = 0;
        /** @type {number} */
        this.width = 0;
        /** @type {number} */
        this.height = 0;
        /** @type {number} */
        this.delay = 0;
        /** @type {number} */
        this.disposeOp = 0;
        /** @type {number} */
        this.blendOp = 0;
        /** @type {Blob} */
        this.imageData = null;
        /** @type {HTMLImageElement} */
        this.imageElement = null;
    }

    createImage() {
        if (this.imageElement) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            // const url = URL.createObjectURL(this.imageData);
            // this.imageElement = document.createElement('img');
            // this.imageElement.onload = () => {
            //     URL.revokeObjectURL(url);
            //     resolve();
            // };
            // this.imageElement.onerror = () => {
            //     URL.revokeObjectURL(url);
            //     this.imageElement = null;
            //     reject(new Error("Image creation error"));
            // };
            resolve(this.imageData);
            //this.imageElement.src = url;
        });
    }
}

module.exports = {
    APNG,
    Frame
}