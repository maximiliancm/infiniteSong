

var FMOD = {};                          // FMOD global object which must be declared to enable 'main' and 'preRun' and then call the constructor function.
FMOD['preRun'] = prerun;                // Will be called before FMOD runs, but after the Emscripten runtime has initialized
FMOD['onRuntimeInitialized'] = main;    // Called when the Emscripten runtime has initialized
FMOD['INITIAL_MEMORY'] = 64*1024*1024;  // FMOD Heap defaults to 16mb which is enough for this demo, but set it differently here for demonstration (64mb)
FMODModule(FMOD);                       // Calling the constructor function with our object


var gSystem;                            // Global 'System' object which has the Studio API functions.
var gSystemCore;                        // Global 'SystemCore' object which has the Core API functions.
var gEventInstance;                // Global Event Instance for the footstep event.
var gSurfaceInstance = 0;
const intensityLevelParamStrings = ["intensityLevelA", "intensityLevelB","intensityLevelC", "intensityLevelC", "intensityLevelD", "intensityLevelE" ];

const songs = ["event:/BackingDemos/blueSky gen/blueSky GEN",
            "event:/BackingDemos/boba gen/boba GEN",
            "event:/BackingDemos/canopy gen/canopy gen",
            "event:/BackingDemos/diner gen/diner GEN 2",
            "event:/BackingDemos/metal run gen/metal run GEN",
            "event:/BackingDemos/pudding gen/pudding gen",
            "event:/BackingDemos/ramen gen/ramen GEN",
            "event:/BackingDemos/riptide gen/riptide gen",
            "event:/BackingDemos/rite of spring/rite of spring gen"
];

// Simple error checking function for all FMOD return values.
function CHECK_RESULT(result)
{
    if (result != FMOD.OK)
    {
        var msg = "Error!!! '" + FMOD.ErrorString(result) + "'";

        alert(msg);

        throw msg;
    }
}

// Will be called before FMOD runs, but after the Emscripten runtime has initialized
// Call FMOD file preloading functions here to mount local files.  Otherwise load custom data from memory or use own file system. 
function prerun()
{
    var fileUrl = "/public/js/";
    var fileName;
    var folderName = "/";
    var canRead = true;
    var canWrite = false;

    fileName = [
        "Master.bank",
        "Master.strings.bank",
        // "softBank.bank"
    ];

    for (var count = 0; count < fileName.length; count++)
    {
        document.querySelector("#display_out2").value = "Loading " + fileName[count] + "...";

        FMOD.FS_createPreloadedFile(folderName, fileName[count], fileUrl + fileName[count], canRead, canWrite);
    }
}
document.addEventListener('click', function(event) {
    RandomizeIntensity();
  });

// Function called when user drags HTML range slider.
function paramChanged(val)
{
    document.querySelector("#surfaceparameter_out").value = val;
    RandomizeIntensity();
    // if (gEventInstance)
    // {
    //     var result = gEventInstance.setParameterByID(gSurfaceID, parseFloat(val), false);
    //     CHECK_RESULT(result);
    // }
}
var repeatingRandomizer;
// Function called when user presses the "Play event" button
function playEvent()
{
    if (gEventInstance)
    {
        CHECK_RESULT( gEventInstance.start() );
        CHECK_RESULT( gEventInstance.release() );
    }
    repeatingRandomizer = setInterval(MaybeRandomizeIntensity, 10000);
}
function RestartRandomSong()
{
    if(!!gEventInstance)
    {
        stopEvent();
    }
    var eventDescription = {};
    let randomSongString = RandomSong();
    CHECK_RESULT( gSystem.getEvent(randomSongString, eventDescription) );
    var eventInstance = {};
    CHECK_RESULT( eventDescription.val.createInstance(eventInstance) );
    gEventInstance = eventInstance.val;
    playEvent();
}
function stopEvent()
{
    if (gEventInstance)
    {
        CHECK_RESULT( gEventInstance.stop(FMOD.STUDIO_STOP_IMMEDIATE) );
        gEventInstance = null;
    }
    if (repeatingRandomizer) clearInterval(repeatingRandomizer);

}


// Called when the Emscripten runtime has initialized
function main()
{
    // A temporary empty object to hold our system
    var outval = {};
    var result;

    console.log("Creating FMOD System object\n");

    // Create the system and check the result
    result = FMOD.Studio_System_Create(outval);
    CHECK_RESULT(result);

    console.log("grabbing system object from temporary and storing it\n");

    // Take out our System object
    gSystem = outval.val;

    result = gSystem.getCoreSystem(outval);
    CHECK_RESULT(result);

    gSystemCore = outval.val;

    // Optional.  Setting DSP Buffer size can affect latency and stability.
    // Processing is currently done in the main thread so anything lower than 2048 samples can cause stuttering on some devices.
    console.log("set DSP Buffer size.\n");
    result = gSystemCore.setDSPBufferSize(2048, 2);
    CHECK_RESULT(result);

    // Optional.  Set sample rate of mixer to be the same as the OS output rate.
    // This can save CPU time and latency by avoiding the automatic insertion of a resampler at the output stage.
    console.log("Set mixer sample rate");
    result = gSystemCore.getDriverInfo(0, null, null, outval, null, null);
    CHECK_RESULT(result);
    result = gSystemCore.setSoftwareFormat(outval.val, FMOD.SPEAKERMODE_DEFAULT, 0)
    CHECK_RESULT(result);

    console.log("initialize FMOD\n");

    // 1024 virtual channels
    result = gSystem.initialize(1024, FMOD.STUDIO_INIT_NORMAL, FMOD.INIT_NORMAL, null);
    CHECK_RESULT(result);

    // Starting up your typical JavaScript application loop
    console.log("initialize Application\n");

    initApplication();

    // Set the framerate to 50 frames per second, or 20ms.
    console.log("Start game loop\n");

    window.setInterval(updateApplication, 20);

    return FMOD.OK;
}


// Called from main, does some application setup.  In our case we will load some sounds.
function initApplication()
{
    var bankhandle = {};

    console.log("Loading events\n");

    CHECK_RESULT( gSystem.loadBankFile("/Master.bank", FMOD.STUDIO_LOAD_BANK_NORMAL, bankhandle) );
    CHECK_RESULT( gSystem.loadBankFile("/Master.strings.bank", FMOD.STUDIO_LOAD_BANK_NORMAL, bankhandle) );
    // CHECK_RESULT( gSystem.loadBankFile("/softBank.bank", FMOD.STUDIO_LOAD_BANK_NORMAL, bankhandle) );

    // var eventDescription = {};
    // let randomSongString = RandomSong();
    // CHECK_RESULT( gSystem.getEvent(randomSongString, eventDescription) );
    // var eventInstance = {};
    // CHECK_RESULT( eventDescription.val.createInstance(eventInstance) );
    // gEventInstance = eventInstance.val;

    // Find the parameter once and then set by ID
    // Or we can just find by name every time but by ID is more efficient if we are setting lots of parameters
    // var paramDesc = {};
    // CHECK_RESULT( eventDescription.val.getParameterDescriptionByName("Surface", paramDesc) );
    // gSurfaceID = paramDesc.id;

    

    // Make the event audible to start with
    // var surfaceParameterValue = 0.0;
    // CHECK_RESULT( gEventInstance.setParameterByID(gSurfaceID, surfaceParameterValue, false) );

    // Once the loading is finished, re-enable the disabled buttons.
    // document.getElementById("surfaceparameter").disabled = false;
    document.getElementById("stopButton").disabled = false;
    document.getElementById("randomSongButton").disabled = false;

    intensityLevelParamStrings.forEach(element => {
        var paramDesc = {};
        CHECK_RESULT( gSystem.getParameterDescriptionByName(element, paramDesc) );
        // gSurfaceID = paramDesc.id;
        intensityLevels.push(paramDesc.id);
        });
}

function RandomSong() {
    const randomParamIndex = Math.floor(Math.random() * songs.length -1) + 1;
    console.log(songs[randomParamIndex]);
    return songs[randomParamIndex];
  }
var intensityLevels = [];
function getRandomIntensityLevel() {
    return Math.floor(Math.random() * 3) + 1;
  }
  function getRandomIntensityParam() {
    const randomParamIndex = Math.floor(Math.random() * 5) + 1;
    return intensityLevels[randomParamIndex];
  }
function RandomizeIntensity() {
    let i = 0;
    intensityLevels.forEach(element => {
    const randomIntensityLevel = getRandomIntensityLevel();
    result = gSystem.setParameterByID(element, randomIntensityLevel, false);
    CHECK_RESULT(result);
    console.log(intensityLevelParamStrings[i] + "intensity level set to " + randomIntensityLevel);
    i++
    });
}
function MaybeRandomizeIntensity()
{
    const r = Math.random();
    if (r < .05)
    {
        RandomizeIntensity();
    }
    else if (r > .8)
    {
        RandomizeOne();
    }
}

function RandomizeOne() {
    const randomParam = getRandomIntensityParam();
    const randomIntensityLevel = getRandomIntensityLevel();
    const paramIndex = getIndexByValue(intensityLevels,randomParam);
    console.log(intensityLevelParamStrings[paramIndex] + "intensity level set to " + randomIntensityLevel);
    result = gSystem.setParameterByID(randomParam, randomIntensityLevel, false);
    CHECK_RESULT(result);
}

function getIndexByValue(arr, val) {
    return arr.indexOf(val);
  }

// Called from main, on an interval that updates at a regular rate (like in a game loop).
// Prints out information, about the system, and importantly calles System::udpate().
function updateApplication()
{
    var result;
    var cpu = {};

    result = gSystemCore.getCPUUsage(cpu);
    CHECK_RESULT(result);

    var channelsplaying = {};
    result = gSystemCore.getChannelsPlaying(channelsplaying, null);
    CHECK_RESULT(result);

    document.querySelector("#display_out").value = "Channels Playing = " + channelsplaying.val +
                                                   " : CPU = dsp " + cpu.dsp.toFixed(2) +
                                                   "% stream " + cpu.stream.toFixed(2) +
                                                   "% update " + cpu.update.toFixed(2) +
                                                   "% total " + (cpu.dsp + cpu.stream + cpu.update).toFixed(2) +
                                                   "%";

    var numbuffers = {};
    var buffersize = {};
    result = gSystemCore.getDSPBufferSize(buffersize, numbuffers);
    CHECK_RESULT(result);

    var rate = {};
    result = gSystemCore.getSoftwareFormat(rate, null, null);
    CHECK_RESULT(result);

    var sysrate = {};
    result = gSystemCore.getDriverInfo(0, null, null, sysrate, null, null);
    CHECK_RESULT(result);

    var ms = numbuffers.val * buffersize.val * 1000 / rate.val;
    document.querySelector("#display_out2").value = "Mixer rate = " + rate.val + "hz : System rate = " + sysrate.val + "hz : DSP buffer size = " + numbuffers.val + " buffers of " + buffersize.val + " samples (" + ms.toFixed(2) + " ms)";

    // Update FMOD
    result = gSystem.update();
    CHECK_RESULT(result);
}