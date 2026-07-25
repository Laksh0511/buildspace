import { google } from "googleapis";
import * as dotenv from "dotenv";
import { db } from "@db/drizzle";
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
async function seedCoursesFromPlaylists() {
  console.log("🚀 Starting YouTube content import...\n");

  // 1. Fetch all playlists
  const playlists = await fetchChannelPlaylists();

  // 2. Filter out system playlists (uploads, liked, etc.)
  const coursePlaylists = playlists.filter((playlist) => {
    const title = playlist.snippet?.title || "";
    // Skip system playlists
    const isSystemPlaylist =
      title === "Uploads" || title === "Liked videos" || title === "Favorites";
    return !isSystemPlaylist;
  });

  console.log(`📚 Processing ${coursePlaylists.length} course playlists...\n`);

  let coursesAdded = 0;
  let lessonsAdded = 0;

  // 3. Process each playlist as a course
  for (const playlist of coursePlaylists) {
    const playlistId = playlist.id!;
    const snippet = playlist.snippet!;
    const contentDetails = playlist.contentDetails!;

    const title = snippet.title || "Untitled Course";
    const description =
      snippet.description ||
      `Complete ${title} course for beginners. Learn ${title.toLowerCase()} with practical examples and hands-on projects.`;
    const videoCount = contentDetails.itemCount || 0;
    const thumbnail =
      snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || null;

    const duration = calculateDuration(videoCount);
    const points = calculatePoints(videoCount);

    console.log(`📖 Processing course: ${title}`);
    console.log(
      `    Videos: ${videoCount}, Difficulty: ${difficulty}, XP: ${points}`,
    );

    // Check if course already exists
    const existingCourse = await db.query.courses.findFirst({
      where: (courses, { eq }) => eq(courses.title, title),
    });

    if (existingCourse) {
      console.log(`    ⏭️  Course already exists, skipping...`);
      continue;
    }

    // Insert course
    const [course] = await db
      .insert(courses)
      .values({
        title: title,
        description: description,
        difficulty: difficulty,
        duration: duration,
        points: points,
        thumbnail: thumbnail,
      })
      .returning();

    coursesAdded++;

    // Fetch videos for this playlist
    const videos = await fetchPlaylistVideos(playlistId, title);

    // Insert lessons
    if (videos.length > 0) {
      const lessonValues = videos.map((video, index) => {
        const videoSnippet = video.snippet!;
        const videoId = video.contentDetails?.videoId;

        return {
          title: videoSnippet.title || `Lesson ${index + 1}`,
          content:
            videoSnippet.description ||
            `Watch this video to learn ${title.toLowerCase()}. Complete tutorial with practical examples.`,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          order: index + 1,
          courseId: course.id,
        };
      });

      await db.insert(lessons).values(lessonValues);
      lessonsAdded += lessonValues.length;
    }

    console.log(`    ✅ Added ${videos.length} lessons\n`);
  }

  console.log("✨ Import complete!");
  console.log(`   📚 Courses added: ${coursesAdded}`);
  console.log(`   📹 Lessons added: ${lessonsAdded}`);
}


//run imports
seedCoursesFromPlaylists().then(()=>{
    console.log("Yt content import finished");
    process.exit();
}).catch((error)=>{
    console.error("Import Failed: ",error);
    process.exit();
})