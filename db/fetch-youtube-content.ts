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

async function fetchChannelPlaylists(){
    //fetch playlists from channel
    if(!CHANNEL_ID){
        throw new Error("YOUTUBE_CHANNEL_ID is not set in .env local");
    }

    console.log("Fetching playlists from channel...")
    let allPlaylists: any[] = [];
    let pageToken: string | undefined = undefined;

    do{ 
        const response:any=await youtube.playlists.list({
            part:["snippet","contentDetails"],
            channelId:CHANNEL_ID,
            maxResults:BATCH_SIZE,
            pageToken:pageToken,
    })

    const playlists=response.data.items || [];
    allPlaylists=[...allPlaylists,...playlists];
    pageToken=response.data.nextPageToken || undefined;

    console.log(`Found ${playlists.length} playlists from channel...`)
    }while(pageToken);

    return allPlaylists;
}

//fetch all videos in a playlist
async function fetchPlaylistVideos(playlistId: string, playlistTitle: string) {
  console.log(`  📹 Fetching videos for: ${playlistTitle}`);

  let allVideos: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const response:any = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: playlistId,
      maxResults: BATCH_SIZE,
      pageToken: pageToken,
    });

    const videos = response.data.items || [];
    allVideos = [...allVideos, ...videos];
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  console.log(`    ✅ Found ${allVideos.length} videos`);
  return allVideos;
}

//seed the db
async function seedCoursesFromPlaylists(){
    console.log("Starting youtube content import...");


    //fetch all playlists
    const playlists=await fetchChannelPlaylists();
    //filter out system playlists
    const coursePlaylists=playlists.filter((playlist)=>{
        const title=playlist.snippet?.title||"";
        //skip system playlists
        const isSystemPlaylist= title==="Uploads"||title==="Favorites"||title==="Watch Later"||title==="Liked videos";
        return !isSystemPlaylist;
    })

    console.log(`Processing ${coursePlaylists.length} course playlists ...\n`);

    let coursesAdded=0;
    let lessonsAdded=0;
    //Process each playlist as a course
    for(const playlist of coursePlaylists){
        const playlistId=playlist.id;
        const snippet=playlist.snippet;

    }

}

//run imports
seedCoursesFromPlaylists().then(()=>{
    console.log("Yt content import finished");
    process.exit();
}).catch((error)=>{
    console.error("Import Failed: ",error);
    process.exit();
})