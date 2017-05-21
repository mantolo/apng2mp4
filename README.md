# apng2mp4
A node utility application that batch converts APNG to MP4 video using ffmpeg W.R.T frame delays. It's best use case is to produce [Telegram GIF](https://telegram.org/blog/gif-revolution) (MP4) by feeding APNG format files  
While there may be already tools to do the same. This project was meant to be on academic purpose

# Credits
[davidmz: apng-js](https://github.com/davidmz/apng-js)  
[Rendering Canvas to mp4 using nodejs](https://scwu.io/blog/2015/09/11/Rendering-Canvas-to-mp4-using-nodejs/)  
[FFMPEG Slideshow wiki](https://trac.ffmpeg.org/wiki/Slideshow)

# Install
- `npm install` ([node-canvas install guide](https://github.com/Automattic/node-canvas))

- [ffmpeg](https://ffmpeg.org/)

# Usage
1. place your APNG files in root of repository
2. `npm run convert`
