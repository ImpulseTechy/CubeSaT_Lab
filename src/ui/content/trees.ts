/**
 * Every subsystem, broken down.
 *
 * One tree per part of the satellite: what it is made of, how it works, and
 * what catches people out. Same writing rule as everywhere else - a 15-year-old
 * must be able to read every leaf.
 *
 * These are the "how does this actually work" layer that sits under the
 * one-paragraph summaries in the cutaway diagram.
 */

export interface TreeNode {
  id: string;
  label: string;
  short: string;
  detail: string;
  children?: TreeNode[];
}

// ---------------------------------------------------------------------------

const POWER: TreeNode = {
  id: 'eps',
  label: 'Power system',
  short: 'Everything to do with electricity on board.',
  detail:
    'Without this nothing else runs. Of every CubeSat failure that has been written up, about one in seven traces back to power.',
  children: [
    {
      id: 'make', label: 'Making it', short: 'Turning sunlight into electricity.',
      detail: 'Solar cells are the only source of new energy a satellite has.',
      children: [
        {
          id: 'cells', label: 'Solar cells', short: 'Convert about a third of the sunlight hitting them.',
          detail:
            'Space-grade cells are far better than the ones on a house roof — roughly 30% efficient instead of 20% — because every gram and every centimetre counts. They are also brittle and expensive, which is why they are glued flat to the sides.',
        },
        {
          id: 'angle', label: 'Why the angle matters', short: 'A panel edge-on to the Sun makes almost nothing.',
          detail:
            'A panel facing the Sun squarely catches all the light that falls on it. Tilt it and it catches less, in proportion to the tilt. At 60 degrees off you get half. Edge-on you get nothing at all. This is why which way the satellite points changes the power so dramatically.',
        },
        {
          id: 'deploy', label: 'Stuck-on or fold-out', short: 'Fold-out wings catch roughly three times more.',
          detail:
            'Cells glued to the body are simple and safe but limited by the size of the satellite. Fold-out wings unfold once in orbit and can triple your power — at the cost of real weight, and a mechanism that has to work first time with nobody there to help.',
        },
      ],
    },
    {
      id: 'store', label: 'Storing it', short: 'Getting through Earth’s shadow.',
      detail: 'For about 35 minutes of every lap the panels make nothing at all.',
      children: [
        {
          id: 'battery', label: 'The battery', short: 'Rechargeable cells, much like a phone’s.',
          detail:
            'Usually the same chemistry as a laptop battery. It charges whenever there is spare sunlight and discharges in the dark. It will do this roughly 5,500 times a year, every year, with no way to replace it.',
        },
        {
          id: 'cycles', label: 'Shallow sips last longer', short: 'Draining it hard every lap wears it out fast.',
          detail:
            'A battery that drops to 10% every lap will not last the mission. One that only dips to 85% can last for years. This is why engineers fit a bigger battery than they strictly need — not for capacity, but so each lap only takes a small sip.',
        },
        {
          id: 'cold', label: 'The freezing problem', short: 'Charging a cold battery damages it permanently.',
          detail:
            'Below 0 °C, charging a lithium battery plates metal inside it and ruins it for good. Satellites in shadow get very cold, so many carry a small electric heater — which itself draws power from the very battery it is protecting.',
        },
      ],
    },
    {
      id: 'share', label: 'Sharing it out', short: 'Getting the right power to the right part.',
      detail: 'A board in the middle of the stack does the distributing.',
      children: [
        {
          id: 'board', label: 'The power board', short: 'The switchboard of the satellite.',
          detail:
            'It takes the messy, varying output of the solar cells, turns it into the steady voltages each part needs, and can cut power to anything that misbehaves. It also protects the battery from being over-charged or completely drained.',
        },
        {
          id: 'mppt', label: 'Squeezing more out', short: 'Smart boards get about 5% more from the same panels.',
          detail:
            'Solar cells have one sweet spot where they give the most power, and it moves as they heat up and cool down. A smarter board constantly hunts for that spot. A small gain, but free weight-wise — one of the cheapest wins available.',
        },
      ],
    },
    {
      id: 'spend', label: 'Spending it', short: 'Where the electricity actually goes.',
      detail: 'Every part draws some. The instrument usually draws the most.',
      children: [
        {
          id: 'loads', label: 'What each part draws', short: 'The computer sips; the camera and radio gulp.',
          detail:
            'A computer might use less than half a watt continuously. A camera can use six watts while running, and a transmitter several more while sending. The continuous small draws add up to more than people expect.',
        },
        {
          id: 'duty', label: 'How often you run things', short: 'The single most powerful choice you make.',
          detail:
            'You cannot change physics, but you can change how often the hungry parts are switched on. Running a camera a quarter of the time instead of all the time is often the difference between a satellite that survives and one that does not.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const FRAME: TreeNode = {
  id: 'structure',
  label: 'The frame',
  short: 'The aluminium skeleton that holds everything and survives the launch.',
  detail:
    'The part students worry about most and the part that goes wrong least — of 112 tracked missions, only two failed because of launch forces.',
  children: [
    {
      id: 'holds', label: 'Holding it together', short: 'Everything bolts into this.',
      detail:
        'The frame decides where every other part can physically sit, how they connect to each other, and how easy the whole thing is to take apart again when something needs fixing during the build.',
      children: [
        {
          id: 'stack', label: 'The stack', short: 'Boards sit one above another like slices of bread.',
          detail:
            'Circuit boards are mounted parallel to each other and joined by a connector that runs through all of them, so power and messages reach every board. It is a tidy arrangement that also makes it easy to swap one board out during building.',
        },
        {
          id: 'balance', label: 'Where the weight sits', short: 'Heavy things go low and central.',
          detail:
            'A satellite with its weight bunched to one side is harder to turn and harder to hold steady. The rules even set limits on how far off-centre the weight may be, so the launcher can predict how it will behave on the way out.',
        },
      ],
    },
    {
      id: 'launch', label: 'Surviving the launch', short: 'The most violent eight minutes of its life.',
      detail: 'A rocket shakes its cargo harder than almost anything on Earth.',
      children: [
        {
          id: 'shake', label: 'Shaking', short: 'Tested on a machine that recreates the rocket.',
          detail:
            'Before it can fly, the satellite is bolted to a shaker table and vibrated as hard as the rocket will vibrate it, then checked to see whether anything has cracked, come loose or stopped working. Teams routinely find problems here, which is exactly the point.',
        },
        {
          id: 'loose', label: 'Nothing may come loose', short: 'A single loose screw can end a mission.',
          detail:
            'Anything that falls off becomes space debris and could damage the rocket or another satellite. Screws get glued, wires get tied down, and everything is checked again after shaking.',
        },
      ],
    },
    {
      id: 'rules', label: 'Following the rulebook', short: 'Break the rules and you do not fly.',
      detail: 'The shared standard is what makes cheap launches possible.',
      children: [
        {
          id: 'rails', label: 'The rails', short: 'Four smooth edges that slide inside the launcher.',
          detail:
            'The satellite sits in a spring-loaded box and slides out along these rails. They have to be a precise width and smoothness, because if they catch, the satellite jams in the box and never deploys at all.',
        },
        {
          id: 'switch', label: 'The switch that wakes it up', short: 'It must stay completely off until it is clear.',
          detail:
            'A switch held down by the wall of the launcher keeps the satellite dead while it is inside. The moment it slides out, the switch pops up and the satellite boots for the first time. It must also stay radio-silent for 45 minutes afterwards, so it cannot interfere with the rocket.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const COMPUTER: TreeNode = {
  id: 'obc',
  label: 'Onboard computer',
  short: 'The small, tough computer that decides what happens and when.',
  detail:
    'Far less powerful than a phone, because it has to use almost no electricity and survive radiation that would crash a laptop.',
  children: [
    {
      id: 'decides', label: 'Making decisions', short: 'Running the satellite’s daily routine.',
      detail: 'Nobody is up there, so the satellite has to run itself.',
      children: [
        {
          id: 'schedule', label: 'The timetable', short: 'What to do, and exactly when.',
          detail:
            'Take a picture over this part of the world. Switch the radio on two minutes before the ground station comes into view. Turn the camera off if the battery drops too low. Most of what a satellite does is a timetable written before launch.',
        },
        {
          id: 'modes', label: 'Modes', short: 'Different behaviour for different situations.',
          detail:
            'A satellite usually has a handful of modes: normal working, low-power, and a safe mode it falls into when something is wrong. Safe mode switches off everything non-essential and just keeps the radio alive so you can work out what happened.',
        },
      ],
    },
    {
      id: 'tough', label: 'Surviving space', short: 'Radiation genuinely breaks computers.',
      detail: 'There is no atmosphere up there to absorb what the Sun throws out.',
      children: [
        {
          id: 'bitflip', label: 'Flipped bits', short: 'A particle can change a 1 into a 0.',
          detail:
            'High-energy particles pass straight through a chip and can flip a single bit of memory. Usually harmless, occasionally catastrophic — if it flips the wrong bit, the software crashes or starts doing something nonsensical.',
        },
        {
          id: 'watchdog', label: 'The watchdog', short: 'A timer that reboots a frozen computer.',
          detail:
            'The computer has to tap a timer regularly to say it is still healthy. If it stops tapping — because it has crashed or frozen — the timer runs out and forcibly restarts it. It is the simplest and most valuable piece of protection on board.',
        },
      ],
    },
    {
      id: 'software', label: 'The software', short: 'Consistently underestimated by almost everyone.',
      detail:
        'University teams report this as the single most time-consuming job on the whole project.',
      children: [
        {
          id: 'fsw', label: 'Writing it', short: 'Small, simple and relentlessly tested.',
          detail:
            'The code has to handle every situation nobody thought would happen, because there is no way to log in and fix things. Good teams run their software against a simulated satellite for months before launch.',
        },
        {
          id: 'update', label: 'Changing it later', short: 'Possible, and terrifying.',
          detail:
            'You can send up new software, but a failed update can leave a satellite unable to boot — permanently. Sensible designs keep a known-good copy that the satellite can always fall back to.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const POINTING: TreeNode = {
  id: 'adcs',
  label: 'Pointing system',
  short: 'Works out which way the satellite is facing, and changes it.',
  detail:
    'In space there is nothing to push against, which makes turning a satellite a genuinely strange engineering problem.',
  children: [
    {
      id: 'know', label: 'Knowing which way you face', short: 'You cannot correct what you cannot measure.',
      detail: 'Several cheap sensors, none of which is reliable on its own.',
      children: [
        {
          id: 'sun', label: 'Sun sensors', short: 'Work out where the Sun is.',
          detail:
            'Small light detectors on each face. Whichever face is brightest is pointing nearest the Sun. Simple, cheap and accurate — but completely blind during the 35 minutes of each lap spent in Earth’s shadow.',
        },
        {
          id: 'mag', label: 'Magnetic sensors', short: 'Feel Earth’s magnetic field, like a compass.',
          detail:
            'They work in darkness, which is their great advantage. But they are easily confused by the satellite’s own electromagnets and by any current flowing nearby, so readings have to be taken when the magnets are switched off.',
        },
        {
          id: 'gyro', label: 'Spin sensors', short: 'Measure how fast it is turning right now.',
          detail:
            'The same kind of sensor that tells your phone it has been rotated. Excellent at measuring change, but the small errors add up over minutes — so they have to be corrected regularly against the Sun or the magnetic field.',
        },
      ],
    },
    {
      id: 'turn', label: 'Changing which way you face', short: 'With no fuel and nothing to push against.',
      detail: 'Two practical options, and they are usually used together.',
      children: [
        {
          id: 'mtq', label: 'Electromagnets', short: 'Push against Earth’s magnetic field.',
          detail:
            'Coils of wire that become magnets when electricity flows through them. They push gently against Earth’s own magnetic field — the only thing out there to push against. No fuel, no moving parts, but slow and weak, and they cannot push in every direction at once.',
        },
        {
          id: 'wheels', label: 'Spinning wheels', short: 'Spin a wheel one way, the satellite turns the other.',
          detail:
            'Speed up a wheel inside the satellite and the satellite itself rotates the opposite way. Fast and accurate enough to photograph a specific town. But the wheels eventually reach full speed and have to be slowed down, which is what the electromagnets are for.',
        },
      ],
    },
    {
      id: 'jobs', label: 'What it is actually for', short: 'Four jobs, in order of difficulty.',
      detail: 'Each one demands more than the last.',
      children: [
        {
          id: 'stop', label: 'Stopping the spin', short: 'The very first job after release.',
          detail:
            'The launcher throws the satellite out tumbling. Until that stops, the panels only catch sunlight in flashes and the antenna sweeps past your ground station instead of pointing at it. Nothing else can begin until this is done.',
        },
        {
          id: 'sunpoint', label: 'Facing the Sun', short: 'The safest thing to do when in trouble.',
          detail:
            'Turning the panels towards the Sun maximises electricity. It is what a satellite usually does in safe mode, because whatever else is wrong, charging the battery buys you time to fix it.',
        },
        {
          id: 'nadir', label: 'Facing the ground', short: 'What a camera needs.',
          detail:
            'Holding one side aimed at Earth so a camera can photograph it and an antenna can point down at your station. Harder, because the satellite has to keep slowly rotating as it goes round to stay pointed at the ground.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const RADIO: TreeNode = {
  id: 'comms',
  label: 'Radio',
  short: 'The only link you will ever have with your satellite.',
  detail:
    'The biggest single cause of failure — more than a quarter of documented CubeSat failures are radio problems.',
  children: [
    {
      id: 'link', label: 'Reaching the ground', short: 'Shouting across hundreds of kilometres.',
      detail: 'Everything about a radio link is a fight against distance.',
      children: [
        {
          id: 'distance', label: 'Distance weakens everything', short: 'Twice as far means four times weaker.',
          detail:
            'A radio signal spreads out as it travels, so very little of it reaches any one antenna. A satellite near the horizon is about three times further away than one directly overhead, which is why the signal is weakest at the start and end of every pass.',
        },
        {
          id: 'bands', label: 'Which radio band', short: 'Slow and forgiving, or fast and fussy.',
          detail:
            'Lower-frequency radios are slow but easy — a simple wire aerial will do. Higher-frequency ones can send a hundred times more data, but need a dish on the ground and have to be aimed far more accurately.',
        },
        {
          id: 'antenna', label: 'The aerial', short: 'Usually folded flat, then springs out.',
          detail:
            'Tape-measure-like metal strips are folded against the body for launch and held by a wire. Once in orbit the wire is melted and they spring out. If that fails to happen the satellite is effectively mute, and several missions have ended exactly this way.',
        },
      ],
    },
    {
      id: 'tradeoff', label: 'The speed trade', short: 'Faster sending means a weaker signal.',
      detail: 'This is the trade that catches almost every first-time team.',
      children: [
        {
          id: 'ratetrade', label: 'Ten times faster costs ten times the strength',
          short: 'The same signal split across more data.',
          detail:
            'Sending faster divides the same amount of radio energy between more pieces of data, so each one arrives weaker and harder to pick out from the noise. At some point it simply stops being readable, however many times the satellite flies over.',
        },
        {
          id: 'margin', label: 'Leaving yourself room', short: 'A link that only just works does not work.',
          detail:
            'Rain, a slightly misaligned aerial, or someone else’s interference will each eat into your signal. Engineers deliberately design the link about four times stronger than the bare minimum so that a bad day does not mean silence.',
        },
        {
          id: 'ground', label: 'Fix it on the ground instead', short: 'Usually cheaper than fixing the satellite.',
          detail:
            'A bigger, quieter antenna on Earth can hear a satellite that a small one cannot — and you can upgrade it any time, which you certainly cannot do once the satellite has launched.',
        },
      ],
    },
    {
      id: 'legal', label: 'Permission to transmit', short: 'You cannot just switch a transmitter on.',
      detail: 'Radio is regulated everywhere, and space radio especially so.',
      children: [
        {
          id: 'licence', label: 'Getting a licence', short: 'Months of paperwork, started early.',
          detail:
            'You need permission from your country’s radio authority before you can transmit from space, and the frequency has to be coordinated internationally so you do not interfere with anyone. Teams routinely underestimate how long this takes.',
        },
        {
          id: 'amateur', label: 'The amateur radio route', short: 'How most student satellites do it.',
          detail:
            'Amateur radio operators have bands set aside for exactly this, and a worldwide community that will happily help you coordinate — and then listen for your satellite and send you the data they catch. It is one of the genuinely welcoming parts of this field.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const INSTRUMENT: TreeNode = {
  id: 'payload',
  label: 'The instrument',
  short: 'The reason the satellite exists at all.',
  detail:
    'Everything else on board exists to keep this alive, pointed correctly, and able to send its results home.',
  children: [
    {
      id: 'kinds', label: 'What it might be', short: 'Cameras, sensors, experiments.',
      detail: 'The choice shapes every other decision you make.',
      children: [
        {
          id: 'camera', label: 'A camera', short: 'What most teams want, and the hardest to fly.',
          detail:
            'Photographing Earth is the obvious mission and the most demanding one. It needs power, accurate pointing, and it makes enormous amounts of data compared with anything else on this list.',
        },
        {
          id: 'sensor', label: 'A sensor', short: 'Measures something invisible.',
          detail:
            'Radiation levels, magnetic fields, the thin upper atmosphere. Readings are tiny compared with a photograph, so the data gets home easily. Far less glamorous and far more likely to succeed.',
        },
        {
          id: 'experiment', label: 'An experiment', short: 'Testing whether something works in space.',
          detail:
            'A new material, a biological sample, a novel radio. Because CubeSats are cheap, they are where new ideas go to be tried before anyone risks them on a big mission. Failure is an acceptable outcome here, which is unusual.',
        },
      ],
    },
    {
      id: 'costs', label: 'What it costs you', short: 'Three bills, all paid by everything else.',
      detail: 'An instrument is never free.',
      children: [
        {
          id: 'power', label: 'Electricity', short: 'Usually the hungriest thing on board.',
          detail:
            'A camera might draw six watts while running, when the whole satellite only generates three or four on average. That is why you cannot leave it on — and why how often you run it is the most important setting you have.',
        },
        {
          id: 'data', label: 'Data', short: 'The trap that catches almost everyone.',
          detail:
            'A good camera can fill its storage in a day. If the radio can only send a fraction of that home during the few minutes of contact available, the rest is simply lost. The satellite works perfectly and you still never see most of the pictures.',
        },
        {
          id: 'aim', label: 'Accurate aiming', short: 'Pointing at nothing in particular is easy.',
          detail:
            'A camera has to be held steady and aimed while the satellite races past at nearly eight kilometres a second. That demand drives you towards spinning wheels, which are heavy and power-hungry — so the instrument ends up deciding the pointing system too.',
        },
      ],
    },
    {
      id: 'results', label: 'Getting results home', short: 'Choosing what is worth sending.',
      detail: 'When you cannot send everything, you have to choose.',
      children: [
        {
          id: 'squash', label: 'Squashing the data', short: 'Smaller files, slightly worse results.',
          detail:
            'Compressing an image before sending it can shrink it enormously, at the cost of some detail. For many missions that trade is obviously worth it — a slightly rougher picture you actually receive beats a perfect one you never do.',
        },
        {
          id: 'choose', label: 'Deciding on board', short: 'Only send what is actually interesting.',
          detail:
            'A satellite can check its own pictures and throw away the ones that are entirely cloud. Being selective in orbit is often worth more than any radio upgrade, because the cheapest data to send is the data you decided not to send.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const TEMPERATURE: TreeNode = {
  id: 'thermal',
  label: 'Keeping it at the right temperature',
  short: 'Stopping it cooking in sunlight and freezing in shadow.',
  detail:
    'A satellite swings between those two extremes roughly sixteen times a day, every day, for years.',
  children: [
    {
      id: 'why', label: 'Why space is hard', short: 'Heat has only one way out.',
      detail: 'Everything you know about cooling things down stops applying.',
      children: [
        {
          id: 'noair', label: 'There is no air', short: 'No breeze, no fan, no cooling.',
          detail:
            'On Earth, warm things lose heat to the air around them. In space there is no air, so the only way heat can leave is by radiating away as invisible infrared light. A fan in a vacuum does nothing at all except waste electricity.',
        },
        {
          id: 'extremes', label: 'The swing', short: 'Above +100 °C and below −30 °C.',
          detail:
            'In direct sunlight a bare metal satellite can climb past the boiling point of water. Forty-five minutes later, in Earth’s shadow, it can fall well below freezing. Then it does it again. Metals expand and contract each time, and solder joints eventually tire of it.',
        },
      ],
    },
    {
      id: 'control', label: 'Controlling it', short: 'Mostly with paint and tape.',
      detail: 'The cheapest engineering on the whole satellite, and some of the most effective.',
      children: [
        {
          id: 'surface', label: 'What colour the outside is', short: 'Decides how much heat you absorb and release.',
          detail:
            'A shiny bare-metal surface absorbs sunlight well and radiates heat badly, so it gets hot and stays hot. A white painted surface does the opposite. Choosing the finish on each face is how most of the temperature problem is actually solved.',
        },
        {
          id: 'mass', label: 'Weight smooths the swing', short: 'Heavier things change temperature more slowly.',
          detail:
            'A heavy satellite takes longer to heat up and longer to cool down, so the swing between hot and cold is far gentler than a simple calculation suggests. This is one of the rare cases where extra weight genuinely helps.',
        },
        {
          id: 'spread', label: 'Moving heat around inside', short: 'Hot parts bolted to cold ones.',
          detail:
            'Metal straps and brackets carry heat from whatever is running hot to the outside surfaces where it can escape. Equally, you can deliberately isolate something to keep it warm. It is plumbing, with heat instead of water.',
        },
      ],
    },
    {
      id: 'protect', label: 'Protecting the fragile parts', short: 'Some things have narrow limits.',
      detail: 'Not everything on board tolerates the full swing.',
      children: [
        {
          id: 'batt', label: 'The battery is the weak point', short: 'It will not charge when frozen.',
          detail:
            'Charging a lithium battery below freezing damages it permanently. Since shadow makes the satellite cold at exactly the time the next sunlight will try to charge it, many satellites carry a small heater — powered by the battery it is protecting.',
        },
        {
          id: 'optics', label: 'Cameras are fussy', short: 'Lenses shift as they warm and cool.',
          detail:
            'Optics expand and contract with temperature, which blurs or shifts the image. A camera that needs to stay sharp may need its temperature held within a few degrees, which is far harder than simply keeping it alive.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

const GROUND: TreeNode = {
  id: 'ground',
  label: 'The ground station',
  short: 'The antenna on Earth that talks to your satellite.',
  detail:
    'Not part of the satellite, which is exactly why teams leave it too late. Post-mortems name it as one of the two most underestimated jobs on a project.',
  children: [
    {
      id: 'kit', label: 'What you need', short: 'Less than people expect, to start with.',
      detail: 'A basic receiving station is genuinely affordable.',
      children: [
        {
          id: 'antenna', label: 'An antenna', short: 'Can be home-made from wire and tubing.',
          detail:
            'For the slow radio bands that most student satellites use, a hand-built aerial made from metal rods works well. For faster bands you need a dish, and the step up in cost and complexity is considerable.',
        },
        {
          id: 'receiver', label: 'A radio receiver', short: 'A small box that plugs into a laptop.',
          detail:
            'A low-cost software radio receiver turns the signal into something your computer can decode. You can buy one for roughly the price of a textbook, and it is enough to hear real satellites today.',
        },
        {
          id: 'rotator', label: 'Something to aim it', short: 'Only needed once you get serious.',
          detail:
            'A motorised mount that follows the satellite across the sky. You can begin without one by pointing by hand, which is a genuinely useful exercise — it teaches you how quickly a satellite crosses the sky.',
        },
      ],
    },
    {
      id: 'predict', label: 'Knowing when to listen', short: 'You get a few minutes, a few times a day.',
      detail: 'Miss the window and you wait hours for another.',
      children: [
        {
          id: 'tracking', label: 'Predicting passes', short: 'Free software tells you exactly when.',
          detail:
            'Organisations publish the orbit of every tracked object in space, updated regularly. Feed that into tracking software and it will tell you to the second when your satellite rises above your horizon and where to point.',
        },
        {
          id: 'doppler', label: 'The pitch changes as it passes', short: 'Like a siren going past.',
          detail:
            'A satellite racing towards you makes its signal arrive slightly higher in frequency, and slightly lower as it recedes — exactly like an ambulance siren. Your receiver has to follow that shift, or the signal drifts out of range mid-pass.',
        },
      ],
    },
    {
      id: 'operate', label: 'Actually operating it', short: 'The part that lasts for years.',
      detail: 'Launch is the beginning of the work, not the end.',
      children: [
        {
          id: 'rota', label: 'Somebody has to be there', short: 'Passes do not respect timetables.',
          detail:
            'The best pass of the day may be at four in the morning. Teams need a rota, and they need it to survive exams, holidays and people graduating. Automating the station is the usual answer, and it is worth doing early.',
        },
        {
          id: 'silence', label: 'When you hear nothing', short: 'Plan for this before launch, not after.',
          detail:
            'About a third of student satellites are never heard from. If that happens, you want a written checklist ready: is the prediction right, is the aerial connected, is the frequency correct, could the satellite still be tumbling. Panic at four in the morning finds nothing.',
        },
        {
          id: 'others', label: 'Other people will help', short: 'A worldwide network of volunteers listens too.',
          detail:
            'There is a global network of open ground stations run by enthusiasts, recording satellites as they pass overhead and publishing what they catch. Your satellite may well be heard by someone on another continent before you hear it yourself.',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------

export const TREES: Record<string, TreeNode> = {
  structure: FRAME,
  eps: POWER,
  obc: COMPUTER,
  adcs: POINTING,
  comms: RADIO,
  payload: INSTRUMENT,
  thermal: TEMPERATURE,
  ground: GROUND,
};

export function findNode(tree: TreeNode, id: string): TreeNode | null {
  if (tree.id === id) return tree;
  for (const c of tree.children ?? []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

/** Every node in a tree, flattened — used by the readability tests. */
export function flatten(tree: TreeNode): TreeNode[] {
  return [tree, ...(tree.children ?? []).flatMap(flatten)];
}
