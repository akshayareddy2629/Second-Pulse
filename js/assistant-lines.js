/* ==========================================================================
   What JARVIS and FRIDAY say, in English, Hindi and Telugu.
   Shared by the site (js/jarvis.js) and the voice recorder (tools/build-voices.mjs).

   {sir}    becomes "sir" for JARVIS and "boss" for FRIDAY, in each language.
   {m|f}    picks the masculine form for JARVIS and the feminine form for FRIDAY
            (Hindi verbs such as {रहा|रही}, Telugu nouns such as {సహాయకుడిని|సహాయకురాలిని}).
   { jarvis: '…', friday: '…' }  gives each assistant its own line.

   After editing a line, run `node tools/build-voices.mjs` to re-record its audio.
   Until then the site falls back to the browser's own voice for that line.
   ========================================================================== */
(() => {
  'use strict';

  const ADDRESS = {
    jarvis: { en: 'sir', hi: 'सर', te: 'సర్' },
    friday: { en: 'boss', hi: 'बॉस', te: 'బాస్' },
  };

  const T = {
    en: {
      greet: {
        jarvis: 'Good day. JARVIS online, the voice of Second Pulse. Ask me about organ donation, say “go to the science”, or “take the pledge”, and consider it done, {sir}.',
        friday: 'Hey {sir}. FRIDAY here, online and ready. Ask me about organ donation, say “go to the science”, or “take the pledge”, and I’ll take care of it.',
      },
      who: 'Your assistant for Second Pulse, {sir}, and a modest tribute to a rather famous pair of AIs. I hold the facts, and I can run this presentation for you.',
      hello: 'Good day, {sir}. At your service. How may I assist?',
      about: 'Second Pulse is an organ-donation initiative, {sir}. The principle is simple: one donor can save up to eight lives. Our app lets you pledge in two minutes, learn the science, and reach an authorised hospital in time.',
      problem: 'Sobering figures, {sir}. Each year roughly five lakh Indians die awaiting an organ. Over one lakh wait at this very moment. Yet fewer than one percent have pledged. The shortage is of awareness, not of kindness.',
      science: 'When the heart stops, the body does not fail at once, {sir}. The brain lasts four to six minutes, the heart four to six hours, the lungs six to eight, the liver twelve hours, the kidneys up to thirty-six, and the corneas as long as fourteen days. Time, {sir}, is life.',
      brain: 'The brain is the most fragile, {sir}, just four to six minutes.',
      heart: 'The heart remains viable four to six hours after death, {sir}.',
      lungs: 'The lungs last six to eight hours, {sir}.',
      liver: 'The liver remains viable for about twelve hours, {sir}.',
      kidney: 'The kidneys are the most forgiving, {sir}, viable for twenty-four to thirty-six hours.',
      cornea: 'One donor can restore sight to two people, {sir}. The corneas may be recovered for up to fourteen days. Imagine a child seeing for the very first time. That is what eye donation accomplishes.',
      how: 'Four steps, {sir}. You register as a donor. You receive a digital card bearing a QR code. In an emergency, a hospital scans it and contacts your family. The organ is transported within the golden window.',
      features: 'Four faculties, {sir}: a digital pledge card, a live organ-viability timer, an emergency request that alerts nearby hospitals, and education in Telugu and English.',
      different: 'Other applications merely list donors, {sir}. We provide time, education, and emergency action, in the local language, built on trust rather than mere technology.',
      legal: 'Entirely above board, {sir}. Selling organs is wholly illegal in India under the THOTA Act. Second Pulse never charges for organs or pledges, those are free. Any money donation is voluntary and funds our awareness work only.',
      future: 'Our roadmap, {sir}: partnerships with government hospitals and eye banks, live ambulance tracking, AI-assisted donor matching, and a pan-India launch in Telugu, Hindi, and English.',
      clock: 'Starting the viability clock, {sir}.',
      pledge: 'An excellent decision, {sir}. Allow me to open the pledge.',
      donate: 'Most generous, {sir}. Opening the donation panel. Every rupee funds awareness, never organs.',
      fullscreen: 'Engaging full-screen, {sir}.',
      lives: 'A single donor can save up to eight lives and restore sight to two more, {sir}. Eight.',
      help: 'I can brief you on the problem, the science, the app, how it works, the law, and our future plans, {sir}. Say “go to the science” to navigate, or “take the pledge”, and I shall arrange it.',
      thanks: 'Always a pleasure to be of service, {sir}.',
      bye: 'Very good, {sir}. I shall be here should you need me.',
      navOk: 'Right away, {sir}.',
      fallback: 'I’m afraid that’s beyond my briefing, {sir}. I can explain the problem, the science, our app, the law, or help you pledge.',
      langSet: 'Switching to English, {sir}.',
      micDenied: 'I shall need microphone permission to hear you, {sir}. You may still type to me.',
    },
    hi: {
      greet: {
        jarvis: 'नमस्ते। जार्विस ऑनलाइन, सेकंड पल्स की आवाज़। अंगदान के बारे में पूछिए, या कहिए “विज्ञान दिखाओ” या “प्रतिज्ञा करो”, और काम हो जाएगा {sir}।',
        friday: 'नमस्ते {sir}। फ्राइडे यहाँ, तैयार हूँ। अंगदान के बारे में पूछिए, या कहिए “विज्ञान दिखाओ” या “प्रतिज्ञा करो”, मैं संभाल लूँगी।',
      },
      who: 'मैं सेकंड पल्स {का सहायक|की सहायिका} हूँ {sir}, दो मशहूर एआई को एक छोटी श्रद्धांजलि। मेरे पास सारी जानकारी है और मैं यह प्रस्तुति चला {सकता|सकती} हूँ।',
      hello: 'नमस्ते {sir}। मैं आपकी सेवा में हूँ। कैसे मदद करूँ?',
      about: 'सेकंड पल्स एक अंगदान पहल है {sir}। बात सीधी है: एक दानकर्ता आठ लोगों की जान बचा सकता है। हमारा ऐप दो मिनट में प्रतिज्ञा, विज्ञान की जानकारी, और समय पर अधिकृत अस्पताल से जोड़ता है।',
      problem: 'आँकड़े गंभीर हैं {sir}। हर साल भारत में लगभग पाँच लाख लोग अंग के इंतज़ार में मर जाते हैं। एक लाख से ज़्यादा लोग इस समय प्रतीक्षा सूची में हैं। फिर भी एक प्रतिशत से कम लोगों ने प्रतिज्ञा ली है। कमी दया की नहीं, जागरूकता की है।',
      science: 'मृत्यु के बाद शरीर एक साथ बंद नहीं होता {sir}। मस्तिष्क चार से छह मिनट, हृदय चार से छह घंटे, फेफड़े छह से आठ घंटे, यकृत बारह घंटे, गुर्दे छत्तीस घंटे तक, और कॉर्निया चौदह दिन तक जीवित रहते हैं। समय ही जीवन है {sir}।',
      brain: 'मस्तिष्क सबसे नाज़ुक है {sir}, केवल चार से छह मिनट।',
      heart: 'हृदय मृत्यु के बाद चार से छह घंटे तक उपयोगी रहता है {sir}।',
      lungs: 'फेफड़े छह से आठ घंटे तक रहते हैं {sir}।',
      liver: 'यकृत लगभग बारह घंटे तक उपयोगी रहता है {sir}।',
      kidney: 'गुर्दे चौबीस से छत्तीस घंटे तक उपयोगी रहते हैं {sir}।',
      cornea: 'एक दानकर्ता दो लोगों को दृष्टि दे सकता है {sir}। कॉर्निया चौदह दिन तक लिया जा सकता है। सोचिए, एक बच्चा पहली बार दुनिया देखता है। यही नेत्रदान करता है।',
      how: 'चार चरण {sir}। आप दानकर्ता के रूप में पंजीकरण करते हैं। आपको क्यूआर वाला डिजिटल कार्ड मिलता है। आपात स्थिति में अस्पताल क्यूआर स्कैन करके परिवार से संपर्क करता है। अंग सुनहरे समय में पहुँचाया जाता है।',
      features: 'चार मुख्य सुविधाएँ {sir}: डिजिटल प्रतिज्ञा कार्ड, अंग समय-सीमा टाइमर, आपातकालीन अनुरोध, और तेलुगु व अंग्रेज़ी में शिक्षा।',
      different: 'दूसरे ऐप केवल दानकर्ताओं की सूची दिखाते हैं {sir}। हम समय, शिक्षा और आपातकालीन कार्रवाई देते हैं, स्थानीय भाषा में, भरोसे पर बने।',
      legal: 'पूरी तरह कानूनी {sir}। भारत में अंग बेचना या खरीदना थोटा कानून के तहत पूरी तरह अवैध है। सेकंड पल्स अंगों या प्रतिज्ञा के लिए कभी पैसा नहीं लेता। कोई भी दान स्वैच्छिक है और केवल जागरूकता के लिए है।',
      future: 'हमारी योजना {sir}: सरकारी अस्पतालों और नेत्र बैंकों से साझेदारी, एम्बुलेंस लाइव ट्रैकिंग, एआई आधारित मिलान, और तेलुगु, हिंदी, अंग्रेज़ी में पूरे भारत में शुरुआत।',
      clock: 'घड़ी शुरू कर {रहा|रही} हूँ {sir}।',
      pledge: 'बहुत अच्छा निर्णय {sir}। प्रतिज्ञा फ़ॉर्म खोल {रहा|रही} हूँ।',
      donate: 'बहुत उदार {sir}। दान पैनल खोल {रहा|रही} हूँ। हर रुपया जागरूकता के लिए, अंगों के लिए कभी नहीं।',
      fullscreen: 'फ़ुल स्क्रीन चालू कर {रहा|रही} हूँ {sir}।',
      lives: 'एक दानकर्ता आठ लोगों की जान बचा सकता है और दो लोगों को दृष्टि दे सकता है {sir}।',
      help: 'मैं समस्या, विज्ञान, ऐप, कानून और भविष्य की योजना बता {सकता|सकती} हूँ {sir}। कहिए “विज्ञान दिखाओ” या “प्रतिज्ञा करो”।',
      thanks: 'सेवा करके खुशी हुई {sir}।',
      bye: 'ठीक है {sir}। ज़रूरत हो तो मैं यहीं हूँ।',
      navOk: 'अभी {दिखाता|दिखाती} हूँ {sir}।',
      fallback: 'क्षमा करें {sir}, यह मेरी जानकारी से बाहर है। मैं समस्या, विज्ञान, ऐप, कानून या प्रतिज्ञा के बारे में बता {सकता|सकती} हूँ।',
      langSet: 'अब मैं हिंदी में बात {करूँगा|करूँगी} {sir}।',
      micDenied: 'सुनने के लिए माइक्रोफ़ोन की अनुमति चाहिए {sir}। आप टाइप भी कर सकते हैं।',
    },
    te: {
      greet: {
        jarvis: 'నమస్కారం. జార్విస్ ఆన్‌లైన్, సెకండ్ పల్స్ గొంతు. అవయవ దానం గురించి అడగండి, లేదా “సైన్స్ చూపించు” లేదా “ప్రతిజ్ఞ చేయి” అనండి, పని పూర్తవుతుంది {sir}.',
        friday: 'హాయ్ {sir}. ఫ్రైడే ఇక్కడ, సిద్ధంగా ఉన్నాను. అవయవ దానం గురించి అడగండి, లేదా “సైన్స్ చూపించు” లేదా “ప్రతిజ్ఞ చేయి” అనండి, నేను చూసుకుంటాను.',
      },
      who: 'నేను సెకండ్ పల్స్ {సహాయకుడిని|సహాయకురాలిని} {sir}, రెండు ప్రసిద్ధ ఏఐలకు ఒక చిన్న నివాళి. నా దగ్గర సమాచారం ఉంది, ఈ ప్రదర్శనను నడపగలను.',
      hello: 'నమస్కారం {sir}. నేను మీ సేవలో ఉన్నాను. ఎలా సహాయం చేయాలి?',
      about: 'సెకండ్ పల్స్ ఒక అవయవ దాన కార్యక్రమం {sir}. విషయం సులభం: ఒక దాత ఎనిమిది మంది ప్రాణాలను కాపాడగలరు. మా యాప్ రెండు నిమిషాల్లో ప్రతిజ్ఞ, శాస్త్ర సమాచారం, సమయానికి అధికృత ఆసుపత్రికి అనుసంధానం ఇస్తుంది.',
      problem: 'గణాంకాలు బాధాకరం {sir}. ప్రతి సంవత్సరం భారతదేశంలో సుమారు ఐదు లక్షల మంది అవయవం కోసం ఎదురు చూస్తూ మరణిస్తారు. ఒక లక్షకు పైగా ఇప్పుడు వెయిటింగ్ లిస్ట్‌లో ఉన్నారు. కానీ ఒక శాతం కంటే తక్కువ మంది ప్రతిజ్ఞ చేశారు. లోపం దయలో కాదు, అవగాహనలో.',
      science: 'మరణం తర్వాత శరీరం ఒకేసారి ఆగదు {sir}. మెదడు నాలుగు నుంచి ఆరు నిమిషాలు, గుండె నాలుగు నుంచి ఆరు గంటలు, ఊపిరితిత్తులు ఆరు నుంచి ఎనిమిది గంటలు, కాలేయం పన్నెండు గంటలు, మూత్రపిండాలు ముప్పై ఆరు గంటల వరకు, కార్నియా పదునాలుగు రోజుల వరకు ఉంటాయి. సమయమే ప్రాణం {sir}.',
      brain: 'మెదడు అత్యంత సున్నితం {sir}, నాలుగు నుంచి ఆరు నిమిషాలు మాత్రమే.',
      heart: 'గుండె మరణం తర్వాత నాలుగు నుంచి ఆరు గంటలు ఉపయోగపడుతుంది {sir}.',
      lungs: 'ఊపిరితిత్తులు ఆరు నుంచి ఎనిమిది గంటలు ఉంటాయి {sir}.',
      liver: 'కాలేయం సుమారు పన్నెండు గంటలు ఉపయోగపడుతుంది {sir}.',
      kidney: 'మూత్రపిండాలు ఇరవై నాలుగు నుంచి ముప్పై ఆరు గంటలు ఉపయోగపడతాయి {sir}.',
      cornea: 'ఒక దాత ఇద్దరికి చూపు ఇవ్వగలరు {sir}. కార్నియాను పదునాలుగు రోజుల వరకు తీసుకోవచ్చు. ఒక చిన్న పిల్లవాడు మొదటిసారి ప్రపంచాన్ని చూడటం ఊహించండి. నేత్రదానం చేసేది ఇదే.',
      how: 'నాలుగు దశలు {sir}. మీరు దాతగా నమోదు చేసుకుంటారు. క్యూఆర్ ఉన్న డిజిటల్ కార్డ్ వస్తుంది. అత్యవసర సమయంలో ఆసుపత్రి క్యూఆర్ స్కాన్ చేసి కుటుంబాన్ని సంప్రదిస్తుంది. బంగారు సమయంలో అవయవం తరలించబడుతుంది.',
      features: 'నాలుగు ముఖ్య సౌకర్యాలు {sir}: డిజిటల్ ప్రతిజ్ఞ కార్డ్, అవయవ సమయ టైమర్, అత్యవసర అభ్యర్థన, తెలుగు మరియు ఇంగ్లీష్‌లో విద్య.',
      different: 'ఇతర యాప్‌లు దాతల జాబితా మాత్రమే చూపుతాయి {sir}. మేము సమయం, విద్య, అత్యవసర చర్య ఇస్తాము, స్థానిక భాషలో, నమ్మకం మీద.',
      legal: 'పూర్తిగా చట్టబద్ధం {sir}. భారతదేశంలో అవయవాలు అమ్మడం కొనడం థోటా చట్టం ప్రకారం పూర్తిగా చట్టవిరుద్ధం. సెకండ్ పల్స్ అవయవాలకు లేదా ప్రతిజ్ఞకు ఎప్పుడూ డబ్బు తీసుకోదు. విరాళం స్వచ్ఛందం, అవగాహన కోసం మాత్రమే.',
      future: 'మా ప్రణాళిక {sir}: ప్రభుత్వ ఆసుపత్రులు, నేత్ర బ్యాంకులతో భాగస్వామ్యం, అంబులెన్స్ లైవ్ ట్రాకింగ్, ఏఐ సరిపోలిక, తెలుగు హిందీ ఇంగ్లీష్‌లో దేశవ్యాప్త ప్రారంభం.',
      clock: 'గడియారం ప్రారంభిస్తున్నాను {sir}.',
      pledge: 'చాలా మంచి నిర్ణయం {sir}. ప్రతిజ్ఞ ఫారం తెరుస్తున్నాను.',
      donate: 'చాలా ఉదారం {sir}. విరాళం ప్యానెల్ తెరుస్తున్నాను. ప్రతి రూపాయి అవగాహన కోసం, అవయవాలకు ఎప్పుడూ కాదు.',
      fullscreen: 'ఫుల్ స్క్రీన్ ఆన్ చేస్తున్నాను {sir}.',
      lives: 'ఒక దాత ఎనిమిది మంది ప్రాణాలు కాపాడగలరు, ఇద్దరికి చూపు ఇవ్వగలరు {sir}.',
      help: 'నేను సమస్య, శాస్త్రం, యాప్, చట్టం, భవిష్యత్ ప్రణాళిక చెప్పగలను {sir}. “సైన్స్ చూపించు” లేదా “ప్రతిజ్ఞ చేయి” అని చెప్పండి.',
      thanks: 'సేవ చేయడం ఆనందం {sir}.',
      bye: 'సరే {sir}. అవసరమైతే నేను ఇక్కడే ఉంటాను.',
      navOk: 'ఇప్పుడే చూపిస్తాను {sir}.',
      fallback: 'క్షమించండి {sir}, అది నా సమాచారంలో లేదు. నేను సమస్య, శాస్త్రం, యాప్, చట్టం లేదా ప్రతిజ్ఞ గురించి చెప్పగలను.',
      langSet: 'ఇప్పటి నుంచి తెలుగులో మాట్లాడుతాను {sir}.',
      micDenied: 'వినడానికి మైక్రోఫోన్ అనుమతి కావాలి {sir}. మీరు టైప్ కూడా చేయవచ్చు.',
    },
  };

  // The line as shown in the chat, for one assistant in one language
  function line(lang, who, key) {
    const src = T[lang] && T[lang][key] != null ? lang : 'en';
    let s = T[src][key];
    if (s == null) return '';
    if (typeof s === 'object') s = s[who] || s.jarvis;
    const female = who === 'friday';
    return s
      .replace(/\{sir\}/g, (ADDRESS[who] || ADDRESS.jarvis)[src])
      .replace(/\{([^{}|]+)\|([^{}|]+)\}/g, (_, m, f) => (female ? f : m));
  }

  // The same line as it should be pronounced
  const spoken = (text) => text.replace(/\bTHOTA\b/g, 'Thota');

  // FNV-1a hash of the spoken text: ties each recorded clip to the exact words it says
  function hash(text) {
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
    return h.toString(16).padStart(8, '0');
  }

  window.SP_LINES = { T, ADDRESS, line, spoken, hash };
})();
