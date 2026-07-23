import { google } from "googleapis";
import * as dotenv from "dotenv";
dotenv.config({path:".env"});

const youtube= google.youtube({
    version: "v3",
    auth: process.env.YOUTUBE_API_KEY

})

//config 
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const BATCH_SIZE = 50; 

//calculate estimated total duration assuming ~15 mins per vid
function calculateDuration(videoCount:number):number{
    return videoCount * 15;
}

//calculate course points based on difficulty and video count
function calculatePoints(difficulty:string,videoCount:number):number{
    const basePoints=
    difficulty==="beginner"
        ? 500
        : difficulty==="intermediate"
          ? 750
          :1000;
    return basePoints + videoCount * 10;
}

//fetch playlists from channel
if(!CHANNEL_ID){
    throw new Error("YOUTUBE_CHANNEL_ID is not set in .env local");
}

console.log("Fetching playlists from channel...")
let allPlaylist: any[] = [];
let pageToken: string | undefined = undefined;

do{
    

}while(pageToken);
