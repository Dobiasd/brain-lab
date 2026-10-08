// Guided tours: each everyday question is walked through as a few steps.
// A step moves the clock to a moment, shows the few feelings and charts that
// matter, highlights brain regions and explains what is going on in plain words.

export type Compare = 'nodrugs' | 'plain' | 'typical' | 'avgpers';

export interface TourStep {
  day: number;
  hour: number;
  title: string;
  text: string;
  feelings: string[];
  charts: string[];
  highlight?: string[];
  /** Switch the brain profile for this step (e.g. ADHD → typical). */
  profile?: string;
}

export interface Tour {
  id: string;
  scenario: string;
  icon: string;
  question: string;
  teaser: string;
  compare: Compare;
  /** What the dashed line means, in words, for this tour. */
  dashed: string;
  steps: TourStep[];
  takeaway: string;
}

export const tours: Tour[] = [
  { id: 'coffee', scenario: 'coffee_bad_night', icon: '☕', compare: 'nodrugs',
    question: 'Why does coffee wake me up, and why the crash later?',
    teaser: 'A short night, two coffees, and what happens to your tiredness.',
    dashed: 'the same day without coffee',
    steps: [
      { day: 1, hour: 6.5, title: 'After a short night', highlight: ['basal_forebrain'],
        feelings: ['sleepiness', 'arousal'], charts: ['pool:adenosine', 'read:sleepiness'],
        text: 'You slept only 3 hours. While you are awake, your brain builds up a "tiredness chemical" called adenosine, and only sleep drains it. This morning there is still a lot left over.' },
      { day: 1, hour: 9, title: 'The first coffee kicks in', highlight: ['striatum', 'basal_forebrain'],
        feelings: ['sleepiness', 'arousal', 'focus'], charts: ['read:sleepiness', 'rec:a2a', 'drug:caffeine'],
        text: 'Caffeine fits into the receptors that normally catch adenosine, like a key broken off in a lock. The tiredness signal can\'t get through, so you feel awake. Compare the solid line with the dashed one: the same morning without coffee.' },
      { day: 1, hour: 15, title: 'Hidden, not removed', highlight: ['basal_forebrain'],
        feelings: ['sleepiness', 'arousal'], charts: ['pool:adenosine', 'read:sleepiness'],
        text: 'Look at the tiredness chemical: it is still climbing, exactly as without coffee. Caffeine only hides tiredness. It does not take it away.' },
      { day: 1, hour: 20, title: 'The comedown', highlight: ['basal_forebrain'],
        feelings: ['sleepiness', 'arousal'], charts: ['read:sleepiness', 'drug:caffeine', 'pool:adenosine'],
        text: 'Your body removes half the caffeine about every 5 hours. As it fades, the tiredness that piled up meanwhile gets through again, and sleepiness climbs steeply over the evening (compare with the afternoon on the solid line). That climb is what people feel as the "crash". You are still less sleepy than without coffee; it is the change within your own day that you notice.' },
      { day: 2, hour: 3, title: 'Sleep pays the debt', highlight: ['basal_forebrain'],
        feelings: ['sleepiness'], charts: ['pool:adenosine'],
        text: 'Only sleep really clears adenosine. (In real life, caffeine still in your system at bedtime also makes falling asleep harder. That part isn\'t modelled here.)' },
    ],
    takeaway: 'Coffee borrows alertness from later. It blocks the tiredness signal while tiredness keeps building up.' },

  { id: 'tolerance', scenario: 'caffeine_tolerance', icon: '📅', compare: 'plain',
    question: 'Why does coffee stop working if I drink it every day?',
    teaser: 'Three coffees a day for 12 days, then you quit.',
    dashed: 'someone who never drinks coffee',
    steps: [
      { day: 0, hour: 12, title: 'First day: coffee works great', highlight: ['striatum'],
        feelings: ['sleepiness', 'arousal'], charts: ['read:sleepiness', 'dens:a2a'],
        text: 'On the first day, three coffees keep you much less sleepy than someone who drinks none (dashed line).' },
      { day: 5, hour: 12, title: 'The brain pushes back', highlight: ['striatum', 'basal_forebrain'],
        feelings: ['sleepiness'], charts: ['dens:a2a', 'read:sleepiness'],
        text: 'The brain notices its tiredness receptors are blocked every day. Its answer: it builds more of them. Look at the receptor count going up.' },
      { day: 11, hour: 12, title: 'Tolerance', highlight: ['striatum'],
        feelings: ['sleepiness', 'arousal'], charts: ['read:sleepiness', 'dens:a2a'],
        text: 'With constant stimulation the opioid receptors become less responsive, and the cells around them adapt. The same dose now gives clearly less relief. Dangerously, tolerance to the high builds faster than tolerance to breathing suppression, so taking more for the same feeling raises the overdose risk.' },
      { day: 13, hour: 12, title: 'Withdrawal', highlight: ['striatum', 'basal_forebrain'],
        feelings: ['sleepiness', 'arousal'], charts: ['read:sleepiness', 'dens:a2a'],
        text: 'You stopped after day 12. Now all those extra receptors catch normal amounts of adenosine, so you feel sleepier than someone who never drank coffee. (Withdrawal headaches come from blood vessels and are not modelled.)' },
      { day: 17, hour: 12, title: 'Back to normal', highlight: ['striatum'],
        feelings: ['sleepiness'], charts: ['dens:a2a', 'read:sleepiness'],
        text: 'Over about a week the brain removes the extra receptors again, and you are back to baseline.' },
    ],
    takeaway: 'Tolerance and withdrawal are the brain keeping its balance: it adds receptors when they\'re blocked and removes them when they\'re overused.' },

  { id: 'hangxiety', scenario: 'alcohol_night', icon: '🍷', compare: 'nodrugs',
    question: 'Why can I feel anxious the morning after drinking?',
    teaser: 'Four drinks in the evening, and the next morning.',
    dashed: 'the same days without alcohol',
    steps: [
      { day: 0, hour: 21, title: 'Drinks: the brakes get stronger', highlight: ['cortex', 'amygdala'],
        feelings: ['anxiety', 'sleepiness'], charts: ['read:anxiety', 'rec:gabaa'],
        text: 'Alcohol strengthens GABA, the brain\'s brakes, and weakens glutamate, its accelerator. You feel relaxed, less anxious and later sleepy.' },
      { day: 0, hour: 22.75, title: 'The brain compensates', highlight: ['cortex'],
        feelings: ['anxiety', 'sleepiness'], charts: ['dens:gabaa', 'read:anxiety'],
        text: 'Within hours the brain starts turning down its brake receptors to get back to balance. Watch the receptor count fall.' },
      { day: 1, hour: 3, title: 'Lighter sleep', highlight: ['basal_forebrain'],
        feelings: ['sleepiness'], charts: ['pool:adenosine'],
        text: 'Alcohol makes sleep shallower and more broken, so less of the tiredness chemical is cleared overnight than usual.' },
      { day: 1, hour: 10.5, title: 'The morning after', highlight: ['cortex', 'amygdala'],
        feelings: ['anxiety', 'sleepiness'], charts: ['read:anxiety', 'dens:gabaa', 'read:sleepiness'],
        text: 'The alcohol is gone, but the turned-down brakes are still turned down, and more tiredness is left over. You are a bit more anxious and more tired than without drinks: "hangxiety". In this cartoon the effect is small. For some people it is much stronger.' },
    ],
    takeaway: 'Whatever a drug pushes, the brain pushes back. When the drug leaves, the push-back remains for a while.' },

  { id: 'stress', scenario: 'acute_stress', icon: '😰', compare: 'plain',
    question: 'What happens in my body during a stressful moment?',
    teaser: 'A 1-hour stressor at 14:00, like an exam or an argument.',
    dashed: 'the same afternoon without stress',
    steps: [
      { day: 0, hour: 13.9, title: 'A calm afternoon', highlight: [],
        feelings: ['anxiety', 'focus'], charts: ['pool:ne', 'pool:cortisol'],
        text: 'Everything is normal. Cortisol, the stress hormone, is naturally low in the afternoon (it peaks in the morning to get you going).' },
      { day: 0, hour: 14.15, title: 'Alarm! (within seconds)', highlight: ['lc', 'amygdala'],
        feelings: ['anxiety', 'focus', 'arousal'], charts: ['pool:ne', 'read:anxiety', 'read:focus'],
        text: 'The brain\'s alarm centre (locus coeruleus) fires and floods the brain with noradrenaline: heart racing, alertness, anxiety. So much of it takes the planning brain offline, which is why your mind can "go blank" in an exam.' },
      { day: 0, hour: 14.6, title: 'The hormone chain (minutes)', highlight: ['hypothalamus', 'pituitary', 'adrenal'],
        feelings: ['mood', 'anxiety'], charts: ['pool:crh', 'pool:acth', 'pool:cortisol'],
        text: 'A slower relay starts: hypothalamus → pituitary gland → adrenal glands on your kidneys, which release cortisol into the blood. Each step takes time, so cortisol peaks 30–60 minutes after the stress started.' },
      { day: 0, hour: 16.5, title: 'The built-in brake', highlight: ['hypothalamus', 'pituitary'],
        feelings: ['anxiety', 'focus'], charts: ['pool:cortisol', 'pool:crh'],
        text: 'Cortisol travels back to the brain and switches the chain off (negative feedback), so the alarm settles back to normal. Healthy stress is a short spike followed by recovery.' },
    ],
    takeaway: 'Stress has a fast alarm (noradrenaline) and a slow hormone wave (cortisol). The slow wave also switches itself off.' },

  { id: 'chronic', scenario: 'chronic_stress', icon: '🗓️', compare: 'plain',
    question: 'Why is long-term stress so harmful?',
    teaser: 'Four weeks of constant stress, then relief.',
    dashed: 'the same weeks without stress',
    steps: [
      { day: 1, hour: 12, title: 'Stress every day', highlight: ['hypothalamus', 'adrenal'],
        feelings: ['anxiety', 'mood'], charts: ['pool:cortisol', 'read:anxiety'],
        text: 'Every day brings stress, so cortisol stays higher than normal day after day.' },
      { day: 14, hour: 12, title: 'The brake wears out', highlight: ['hypothalamus', 'hippocampus'],
        feelings: ['anxiety', 'mood'], charts: ['dens:gr', 'pool:cortisol'],
        text: 'The brain\'s cortisol sensors, the stress brake, get turned down after constant exposure. A weaker brake lets cortisol drift even higher, and the problem feeds itself.' },
      { day: 27, hour: 12, title: 'Mood and rewiring drop', highlight: ['hippocampus', 'pfc'],
        feelings: ['mood', 'anxiety'], charts: ['plasticity', 'read:mood'],
        text: 'Long-term high cortisol reduces the brain\'s capacity to rewire and grow connections, especially in the memory area (hippocampus). Mood sinks. (In some people, such as with burnout or PTSD, years of stress can instead flatten the cortisol rhythm; the model shows only the "too high" pattern.)' },
      { day: 30, hour: 12, title: 'The stress ends…', highlight: ['adrenal'],
        feelings: ['anxiety', 'mood'], charts: ['pool:cortisol', 'read:anxiety'],
        text: 'Within days, cortisol and anxiety drop back.' },
      { day: 41, hour: 12, title: '…but recovery takes weeks', highlight: ['hippocampus'],
        feelings: ['mood'], charts: ['read:mood', 'plasticity', 'dens:gr'],
        text: 'The stress brake and the rewiring capacity recover only slowly, so mood is still below where it would have been. It takes weeks, not days.' },
    ],
    takeaway: 'Short stress is useful. Long stress wears out the brake that ends it and slowly lowers mood.' },

  { id: 'adhd', scenario: 'mph_adhd', icon: '🎯', compare: 'nodrugs',
    question: 'How does ADHD medication help with focus?',
    teaser: 'Ritalin in an ADHD brain, and in a typical one.',
    dashed: 'the same day without medication',
    steps: [
      { day: 0, hour: 7.9, profile: 'adhd', title: 'The sweet spot', highlight: ['pfc'],
        feelings: ['focus'], charts: ['read:focus', 'rec:d1_pfc'],
        text: 'The planning part of the brain (prefrontal cortex) works best with a *medium* amount of dopamine and noradrenaline. Too little and you are distractible; too much and you are scattered. In this ADHD model the levels sit too low.' },
      { day: 0, hour: 10, profile: 'adhd', title: 'Ritalin lifts the levels', highlight: ['pfc', 'vta', 'lc'],
        feelings: ['focus', 'arousal'], charts: ['read:focus', 'rec:d1_pfc', 'drug:methylphenidate'],
        text: 'Ritalin blocks the pumps that clear dopamine and noradrenaline away, so more of them stay around. The planning brain moves toward its sweet spot and focus rises a lot compared to the dashed line.' },
      { day: 0, hour: 15, profile: 'adhd', title: 'Wearing off', highlight: ['pfc'],
        feelings: ['focus'], charts: ['read:focus', 'drug:methylphenidate'],
        text: 'Half the medicine is gone every ~3 hours, so by afternoon the effect fades. That is why some people take a second dose or a long-acting version.' },
      { day: 0, hour: 10, profile: 'typical', title: 'Same dose, typical brain', highlight: ['pfc'],
        feelings: ['focus', 'arousal', 'anxiety'], charts: ['read:focus', 'rec:d1_pfc'],
        text: 'Now the same dose in a typical brain, which already sits close to the sweet spot. There is much less room to improve: lab studies in healthy people find only small and inconsistent gains in focus, while people feel more wired and alert and often overestimate how well they are doing. Compare the gain here with the ADHD steps. Stimulants are not "smart pills".' },
    ],
    takeaway: 'Focus follows an inverted U. Medication helps a lot when you start too low, and adds little when you are already near the sweet spot.' },

  { id: 'ssri', scenario: 'ssri_6w', icon: '💊', compare: 'nodrugs',
    question: 'Why do antidepressants take weeks to work?',
    teaser: 'Six weeks of a daily SSRI in the depression model.',
    dashed: 'the same weeks without the medicine',
    steps: [
      { day: 0, hour: 12, title: 'The starting point', highlight: ['raphe', 'hippocampus'],
        feelings: ['mood', 'anxiety'], charts: ['read:mood', 'plasticity'],
        text: 'This depression model has low mood, a reduced capacity of the brain to rewire, and an overactive stress system. (Depression is not simply "low serotonin". That idea is outdated.)' },
      { day: 2, hour: 12, title: 'Two days in: serotonin up, mood barely moves', highlight: ['raphe'],
        feelings: ['mood'], charts: ['pool:ht', 'fire:raphe'],
        text: 'The SSRI blocks the pump that clears serotonin, so serotonin rises. But serotonin neurons have a thermostat: they sense the extra serotonin and fire less. Watch their activity drop. Mood barely moves yet, and some people even feel more anxious or restless in the first weeks.' },
      { day: 14, hour: 12, title: 'Weeks 1–3: the thermostat gives in', highlight: ['raphe'],
        feelings: ['mood'], charts: ['dens:ht1a_auto', 'fire:raphe', 'pool:ht'],
        text: 'Day after day of high serotonin makes the thermostat receptors slowly switch off. The neurons start firing again and serotonin climbs higher.' },
      { day: 30, hour: 12, title: 'Week 4+: mood follows', highlight: ['hippocampus', 'pfc'],
        feelings: ['mood', 'anxiety'], charts: ['plasticity', 'read:mood'],
        text: 'The sustained serotonin signal boosts the brain\'s rewiring capacity, and mood slowly improves along with it.' },
      { day: 44, hour: 12, title: 'Why it takes a month', highlight: ['hippocampus'],
        feelings: ['mood'], charts: ['read:mood', 'plasticity'],
        text: 'Two slow steps, the thermostat adapting and the brain rewiring, explain the delay. In reality SSRIs help some people a lot and others little. In under 25s, suicidal thoughts can increase in the first weeks, so stay in close contact with the prescriber, and never stop abruptly: reduce slowly with a doctor.' },
    ],
    takeaway: 'The pill acts in hours; the brain needs weeks to adapt and rewire, and that is where the benefit comes from.' },

  { id: 'mdma', scenario: 'mdma', icon: '💜', compare: 'plain',
    question: 'Why do people feel low for days after MDMA?',
    teaser: 'One dose on a Saturday night, and the week after.',
    dashed: 'the same week without MDMA',
    steps: [
      { day: 0, hour: 23.5, title: 'The flood', highlight: ['raphe', 'cortex', 'hypothalamus'],
        feelings: ['mood', 'bonding'], charts: ['pool:ht', 'pool:oxytocin'],
        text: 'MDMA makes serotonin neurons dump their reserves all at once, and it releases the bonding hormone oxytocin: euphoria, warmth, closeness.' },
      { day: 1, hour: 14, title: 'Empty reserves', highlight: ['raphe'],
        feelings: ['mood'], charts: ['store:ht', 'pool:ht'],
        text: 'The serotonin reserves are now largely empty, and refilling them takes days.' },
      { day: 2, hour: 14, title: 'The mid-week blues', highlight: ['raphe'],
        feelings: ['mood', 'bonding'], charts: ['read:mood', 'store:ht'],
        text: 'With less serotonin available, mood dips below normal two or three days later.' },
      { day: 5, hour: 14, title: 'Recovery', highlight: ['raphe'],
        feelings: ['mood'], charts: ['store:ht', 'read:mood'],
        text: 'Reserves refill and mood returns. (Not modelled: the real dangers, which are overheating, dangerously low blood sodium from drinking too much water, and serotonin syndrome when mixed with antidepressants.)' },
    ],
    takeaway: 'Releasers borrow from your reserves, and the payback comes later.' },

  { id: 'healthy', scenario: 'healthy_day', icon: '🏃', compare: 'plain',
    question: 'What does a healthy day do for my brain?',
    teaser: 'Morning sunlight, a run, dinner with friends.',
    dashed: 'the same day spent indoors and alone',
    steps: [
      { day: 0, hour: 9, title: 'Morning sunlight', highlight: ['raphe', 'pineal'],
        feelings: ['mood', 'arousal'], charts: ['pool:melatonin', 'pool:ht'],
        text: 'Bright light boosts serotonin and stops melatonin, the night-time hormone. That tells your body clock "it\'s day" and sets you up to get sleepy on time tonight.' },
      { day: 0, hour: 18, title: 'A run', highlight: ['hypothalamus', 'hippocampus'],
        feelings: ['mood', 'analgesia'], charts: ['pool:endorphin', 'pool:anandamide', 'pool:adenosine'],
        text: 'Exercise releases the body\'s own painkillers (endorphins) and its own cannabis-like chemical (anandamide), a major contributor to the "runner\'s high". It also builds extra sleep pressure for deeper sleep.' },
      { day: 0, hour: 21, title: 'Dinner with friends', highlight: ['hypothalamus', 'striatum', 'amygdala'],
        feelings: ['mood', 'bonding', 'anxiety'], charts: ['pool:oxytocin', 'read:bonding'],
        text: 'Closeness and laughter release oxytocin and dopamine: connection feels good and calms the alarm system.' },
      { day: 1, hour: 1, title: 'Night', highlight: ['pineal'],
        feelings: ['sleepiness'], charts: ['pool:melatonin', 'pool:adenosine'],
        text: 'Melatonin is high at night, and sleep drains the extra tiredness built up by the run.' },
    ],
    takeaway: 'Light, movement and people are three of the strongest natural levers on brain chemistry.' },

  { id: 'sensory', scenario: 'sensory', icon: '🔊', compare: 'typical',
    question: 'Why can busy places be overwhelming for some autistic people?',
    teaser: 'A loud shopping centre, with higher sensory sensitivity.',
    dashed: 'a typical brain in the same place',
    steps: [
      { day: 0, hour: 10, title: 'A quiet morning', highlight: [],
        feelings: ['anxiety', 'focus'], charts: ['state:sensory_load', 'read:anxiety'],
        text: 'One influential hypothesis says that in some autistic brains the balance between excitation and inhibition is shifted, so sensory input is "turned up". In a quiet room this barely matters.' },
      { day: 0, hour: 12, title: 'A busy shopping centre', highlight: ['cortex', 'thalamus', 'lc'],
        feelings: ['anxiety', 'focus'], charts: ['state:sensory_load', 'read:anxiety', 'pool:glu'],
        text: 'Noise, light and crowds drive much more brain excitement than in a typical brain (dashed line). It becomes overload: anxiety rises and focus drops.' },
      { day: 0, hour: 15, title: 'Quiet again', highlight: ['cortex'],
        feelings: ['anxiety', 'focus'], charts: ['state:sensory_load', 'read:anxiety'],
        text: 'After leaving, it settles. Quiet spaces, headphones and breaks are effective because they lower the input. Autism is very diverse, and this is one model, not everyone\'s experience.' },
    ],
    takeaway: 'The same environment can be a very different load on different brains.' },

  { id: 'opioids', scenario: 'opioid_tolerance', icon: '💉', compare: 'nodrugs',
    question: 'What are tolerance and withdrawal with opioid painkillers?',
    teaser: 'Morphine three times a day for 10 days, then stop.',
    dashed: 'the same days without opioids',
    steps: [
      { day: 0, hour: 9, title: 'Strong pain relief', highlight: ['vta', 'lc'],
        feelings: ['analgesia', 'mood'], charts: ['read:analgesia', 'drug:morphine'],
        text: 'Opioids act on the receptors for the body\'s own painkillers (endorphins): strong pain relief and a warm, good feeling. They also quiet the brain\'s alarm centre.' },
      { day: 9, hour: 9, title: 'Tolerance', highlight: ['vta'],
        feelings: ['analgesia', 'mood'], charts: ['dens:mu', 'read:analgesia'],
        text: 'Constant stimulation makes the brain remove opioid receptors. The same dose now gives clearly less relief.' },
      { day: 11, hour: 12, title: 'Withdrawal', highlight: ['lc'],
        feelings: ['anxiety', 'mood', 'arousal'], charts: ['fire:lc', 'read:anxiety', 'dens:mu'],
        text: 'Stopped after day 10. With fewer receptors and no drug, the alarm centre is no longer held down and rebounds: restlessness, anxiety and low mood.' },
      { day: 14, hour: 12, title: 'Slow recovery', highlight: ['lc', 'vta'],
        feelings: ['anxiety', 'mood'], charts: ['dens:mu', 'fire:lc'],
        text: 'Receptors recover over days, so tolerance fades. That is exactly what makes a relapse after a break so dangerous: the old dose can now be deadly. Never combine opioids with alcohol or sedatives. In an overdose, call emergency services and give naloxone if available.' },
    ],
    takeaway: 'Dependence is the brain re-balancing around a drug. Withdrawal is that re-balancing, exposed.' },

  { id: 'ozempic', scenario: 'ozempic', icon: '🍽️', compare: 'nodrugs',
    question: 'How does Ozempic reduce appetite?',
    teaser: 'A weekly injection over six weeks.',
    dashed: 'the same weeks without the injection',
    steps: [
      { day: 0, hour: 12.4, title: 'Before the first injection', highlight: ['gut', 'hypothalamus'],
        feelings: ['hunger'], charts: ['read:hunger', 'pool:ghrelin', 'pool:glp1'],
        text: 'Your gut and brain talk with hormones. An empty stomach releases ghrelin ("eat!"). After a meal the gut releases GLP-1 ("enough"), which lasts only minutes. Hunger rises and falls around meals. The first injection is tomorrow morning.' },
      { day: 3, hour: 12.4, title: 'A long-lasting "I\'m full" signal', highlight: ['hypothalamus', 'gut'],
        feelings: ['hunger'], charts: ['read:hunger', 'rec:glp1r', 'drug:semaglutide'],
        text: 'Semaglutide copies GLP-1 but is built to last a week. It keeps the fullness receptors in the brain switched on all day, so even before lunch you are much less hungry than usual.' },
      { day: 21, hour: 12.4, title: 'Building up', highlight: ['hypothalamus'],
        feelings: ['hunger', 'motivation'], charts: ['drug:semaglutide', 'read:hunger'],
        text: 'Each weekly dose adds to what is left of the last one, so the level climbs over the first weeks. GLP-1 receptors also sit on reward neurons, so food "wanting" is dampened, and many users report fewer cravings for alcohol too.' },
      { day: 41, hour: 12.4, title: 'Six weeks in', highlight: ['hypothalamus'],
        feelings: ['hunger'], charts: ['read:hunger', 'dens:glp1r'],
        text: 'The receptors adapt only a little, so the appetite effect stays. (Not modelled: nausea, slower stomach emptying and the weight loss itself. In reality the dose is raised gradually under a doctor\'s care.)' },
    ],
    takeaway: 'Ozempic doesn\'t remove food from your life: it turns up the gut\'s own "I\'m full" message and keeps it on.' },

  { id: 'ketamine', scenario: 'ketamine', icon: '⚡', compare: 'nodrugs',
    question: 'How can ketamine lift depression so quickly?',
    teaser: 'One treatment in the depression model.',
    dashed: 'the same days without ketamine',
    steps: [
      { day: 1, hour: 10.6, title: 'During the treatment', highlight: ['cortex'],
        feelings: ['perception', 'mood'], charts: ['pool:glu', 'read:perception'],
        text: 'Ketamine blocks NMDA receptors. A leading idea: it blocks them on the brain\'s "brake" neurons, and with the brakes off there is a burst of glutamate, the brain\'s main excitatory messenger. Other explanations are still debated. People feel dissociated for about an hour.' },
      { day: 2, hour: 12, title: 'The next day: a lift', highlight: ['pfc', 'hippocampus'],
        feelings: ['mood'], charts: ['plasticity', 'read:mood'],
        text: 'The glutamate burst triggers fast rewiring, and mood improves within a day. Compare that with the SSRI\'s month-long climb.' },
      { day: 9, hour: 12, title: 'Fading over 1–2 weeks', highlight: ['pfc'],
        feelings: ['mood'], charts: ['read:mood', 'plasticity'],
        text: 'The boost fades over one to two weeks, which is why ketamine treatment is usually repeated under medical care.' },
    ],
    takeaway: 'Different routes to the same goal: the brain\'s capacity to rewire seems central to mood.' },
];

export const tourById = Object.fromEntries(tours.map((t) => [t.id, t]));
