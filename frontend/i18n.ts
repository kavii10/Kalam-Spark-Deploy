// ─── Kalam Spark — Internationalisation (i18n) ───────────────────────────────
// Supported languages: English (en), Tamil (ta), Hindi (hi), Telugu (te),
//                      Kannada (kn), Malayalam (ml)

export type LangCode = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml';

export const LANGUAGES: { code: LangCode; label: string; nativeLabel: string; flag: string }[] = [
  { code: 'en', label: 'English',    nativeLabel: 'English',     flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil',      nativeLabel: 'தமிழ்',       flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi',      nativeLabel: 'हिन्दी',       flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',     nativeLabel: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',    nativeLabel: 'ಕನ್ನಡ',       flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam',  nativeLabel: 'മലയാളം',      flag: '🇮🇳' },
];

export type TranslationKey =
  // Nav
  | 'nav_dashboard' | 'nav_roadmap' | 'nav_planner' | 'nav_resources'
  | 'nav_revision' | 'nav_competitions' | 'nav_mentor' | 'nav_filespeaker' | 'nav_logout'
  // Dashboard
  | 'dash_welcome_back' | 'dash_working_towards' | 'dash_refresh'
  | 'dash_level' | 'dash_streak' | 'dash_stage' | 'dash_progress'
  | 'dash_daily_inspiration' | 'dash_todays_tasks' | 'dash_study_center'
  | 'dash_ask_mentor' | 'dash_roadmap_progress' | 'dash_view_plan'
  | 'dash_rewards' | 'dash_no_rewards' | 'dash_rewards_earn_hint'
  // Onboarding
  | 'ob_setup_journey' | 'ob_whats_name' | 'ob_your_background'
  | 'ob_education_level' | 'ob_choose_level' | 'ob_middle_school'
  | 'ob_high_school' | 'ob_college' | 'ob_self_learner' | 'ob_graduate'
  | 'ob_school_board' | 'ob_choose_board' | 'ob_grade_semester'
  | 'ob_enter_grade' | 'ob_study_field' | 'ob_field_placeholder'
  | 'ob_city' | 'ob_city_placeholder' | 'ob_study_hours' | 'ob_target_year'
  | 'ob_target_year_placeholder' | 'ob_motivation' | 'ob_motivation_placeholder'
  | 'ob_dream_career' | 'ob_dream_placeholder' | 'ob_not_sure'
  | 'ob_career_summary' | 'ob_about_your_career' | 'ob_you_are_all_set'
  | 'ob_continue' | 'ob_back' | 'ob_step_of' | 'ob_build_roadmap'
  | 'ob_view_roadmap'
  // Planner
  | 'pl_todays_tasks' | 'pl_sync_roadmap' | 'pl_add_task' | 'pl_no_tasks'
  | 'pl_completed' | 'pl_all_done' | 'pl_quiz_tab' | 'pl_tasks_tab'
  // Login
  | 'login_title' | 'login_subtitle' | 'login_email' | 'login_name'
  | 'login_sign_in' | 'login_register' | 'login_sign_in_btn' | 'login_create_btn'
  | 'login_google' | 'login_or' | 'login_cross_device' | 'login_restoring' | 'login_creating'
  // General
  | 'days' | 'of' | 'complete';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  nav_dashboard: 'Dashboard', nav_roadmap: 'Roadmap', nav_planner: 'Planner',
  nav_resources: 'Resources', nav_revision: 'Revision', nav_competitions: 'Competitions',
  nav_mentor: 'AI Mentor', nav_filespeaker: 'File Speaker', nav_logout: 'Log Out',
  dash_welcome_back: 'Welcome back,', dash_working_towards: 'Working towards',
  dash_refresh: 'Refresh', dash_level: 'Level', dash_streak: 'Streak',
  dash_stage: 'Stage', dash_progress: 'Progress', dash_daily_inspiration: 'Daily Inspiration',
  dash_todays_tasks: "Today's Tasks", dash_study_center: 'Study Center',
  dash_ask_mentor: 'Ask AI Mentor', dash_roadmap_progress: 'Roadmap Progress',
  dash_view_plan: 'View Plan →', dash_rewards: 'My Rewards',
  dash_no_rewards: 'No rewards yet — complete tasks, stages, and quizzes to earn badges!',
  dash_rewards_earn_hint: 'Keep going to earn your first badge!',
  ob_setup_journey: "Let's set up your journey", ob_whats_name: "What's your name?",
  ob_your_background: 'Your background', ob_education_level: 'Education level',
  ob_choose_level: 'Choose your level...', ob_middle_school: 'Middle School (Class 6–8)',
  ob_high_school: 'High School (Class 9–12)', ob_college: 'College Student',
  ob_self_learner: 'Self-Learner / Working', ob_graduate: 'Post-Graduate',
  ob_school_board: 'School Board', ob_choose_board: 'Choose board...',
  ob_grade_semester: 'Class / Year / Semester', ob_enter_grade: 'e.g. Class 10, 2nd Year B.Tech...',
  ob_study_field: 'Favourite subject / stream', ob_field_placeholder: 'e.g. Science, Maths, Arts...',
  ob_city: 'Your city (optional)', ob_city_placeholder: 'e.g. Chennai, Delhi...',
  ob_study_hours: 'Study hours available per day',
  ob_target_year: 'Target year to achieve your goal', ob_target_year_placeholder: 'e.g. 2026, 2027...',
  ob_motivation: 'Why do you want this career? (optional)', ob_motivation_placeholder: 'e.g. to serve the nation, financial freedom...',
  ob_dream_career: 'Your dream career', ob_dream_placeholder: 'e.g. IAS Officer, Doctor, Engineer...',
  ob_not_sure: 'Not sure? Take the Dream Discovery Quiz',
  ob_career_summary: 'About Your Dream Career', ob_about_your_career: "Here's what it means to be a",
  ob_you_are_all_set: "You're all set!", ob_continue: 'Continue',
  ob_back: 'Back', ob_step_of: 'Step', ob_build_roadmap: 'Accept & Build Roadmap',
  ob_view_roadmap: 'View My Roadmap',
  pl_todays_tasks: "Today's Tasks", pl_sync_roadmap: 'Sync Roadmap',
  pl_add_task: 'Add task...', pl_no_tasks: 'No tasks yet — press Sync Roadmap',
  pl_completed: 'Completed', pl_all_done: 'All done for today! 🎉',
  pl_quiz_tab: 'Quiz', pl_tasks_tab: 'Tasks',
  login_title: 'Kalam Spark', login_subtitle: 'AI Career Architect',
  login_email: 'your@email.com', login_name: 'Your name',
  login_sign_in: 'Sign In', login_register: 'Register',
  login_sign_in_btn: 'Sign In & Sync', login_create_btn: 'Create Account',
  login_google: 'Continue with Google', login_or: 'or',
  login_cross_device: 'Cross-device sync • No password needed',
  login_restoring: 'Restoring Session...', login_creating: 'Creating Account...',
  days: 'days', of: 'of', complete: 'complete',
};

const ta: Translations = {
  nav_dashboard: 'முகப்பு', nav_roadmap: 'வழிமாப்பு', nav_planner: 'திட்டமிடுதல்',
  nav_resources: 'வளங்கள்', nav_revision: 'மறுபார்வை', nav_competitions: 'போட்டிகள்',
  nav_mentor: 'AI வழிகாட்டி', nav_filespeaker: 'கோப்பு பேச்சாளர்', nav_logout: 'வெளியேறு',
  dash_welcome_back: 'மீண்டும் வரவேற்கிறோம்,', dash_working_towards: 'இலக்கை நோக்கி',
  dash_refresh: 'புதுப்பி', dash_level: 'நிலை', dash_streak: 'தொடர்ச்சி',
  dash_stage: 'கட்டம்', dash_progress: 'முன்னேற்றம்', dash_daily_inspiration: 'இன்றைய உத்வேகம்',
  dash_todays_tasks: 'இன்றைய பணிகள்', dash_study_center: 'படிப்பு மையம்',
  dash_ask_mentor: 'AI ஆசிரியரிடம் கேள்', dash_roadmap_progress: 'வழிமாப்பு முன்னேற்றம்',
  dash_view_plan: 'திட்டம் பார் →', dash_rewards: 'என் விருதுகள்',
  dash_no_rewards: 'இன்னும் விருதுகள் இல்லை — பணிகள், கட்டங்கள், வினாடி வினா முடித்து பெறுங்கள்!',
  dash_rewards_earn_hint: 'உங்கள் முதல் பதக்கம் பெற தொடருங்கள்!',
  ob_setup_journey: 'உங்கள் பயணத்தை அமைப்போம்', ob_whats_name: 'உங்கள் பெயர் என்ன?',
  ob_your_background: 'உங்கள் பின்னணி', ob_education_level: 'கல்வி நிலை',
  ob_choose_level: 'உங்கள் நிலையை தேர்ந்தெடுக்கவும்...', ob_middle_school: 'நடுநிலைப் பள்ளி (6–8)',
  ob_high_school: 'உயர் நிலைப் பள்ளி (9–12)', ob_college: 'கல்லூரி மாணவர்',
  ob_self_learner: 'சுயமாக கற்பவர்', ob_graduate: 'முதுகலை',
  ob_school_board: 'பள்ளி வாரியம்', ob_choose_board: 'வாரியம் தேர்ந்தெடு...',
  ob_grade_semester: 'வகுப்பு / ஆண்டு', ob_enter_grade: 'எ.கா. 10ஆம் வகுப்பு, 2ஆம் ஆண்டு...',
  ob_study_field: 'விருப்பமான பாடம்', ob_field_placeholder: 'எ.கா. அறிவியல், கணிதம், கலை...',
  ob_city: 'உங்கள் நகரம் (விரும்பினால்)', ob_city_placeholder: 'எ.கா. சென்னை, கோயம்புத்தூர்...',
  ob_study_hours: 'தினமும் படிக்கும் மணிகள்',
  ob_target_year: 'இலக்கை எந்த ஆண்டில் அடைய விரும்புகிறீர்கள்?', ob_target_year_placeholder: 'எ.கா. 2026, 2027...',
  ob_motivation: 'ஏன் இந்த வாழ்க்கையை விரும்புகிறீர்கள்?', ob_motivation_placeholder: 'எ.கா. நாட்டிற்கு சேவை செய்ய...',
  ob_dream_career: 'உங்கள் கனவு வாழ்க்கை', ob_dream_placeholder: 'எ.கா. IAS அதிகாரி, மருத்துவர்...',
  ob_not_sure: 'தெரியவில்லையா? கனவு கண்டுபிடிப்பு வினாடி வினா எடு',
  ob_career_summary: 'உங்கள் கனவு வாழ்க்கை பற்றி', ob_about_your_career: 'இது என்னவென்று:',
  ob_you_are_all_set: 'தயாராகிவிட்டீர்கள்!', ob_continue: 'தொடரவும்',
  ob_back: 'பின்செல்', ob_step_of: 'படி', ob_build_roadmap: 'ஏற்று வழிமாப்பு உருவாக்கு',
  ob_view_roadmap: 'என் வழிமாப்பை பார்',
  pl_todays_tasks: 'இன்றைய பணிகள்', pl_sync_roadmap: 'வழிமாப்பு ஒத்திசை',
  pl_add_task: 'பணி சேர்...', pl_no_tasks: 'இன்னும் பணிகள் இல்லை',
  pl_completed: 'முடிந்தவை', pl_all_done: 'இன்று முடிந்தது! 🎉',
  pl_quiz_tab: 'வினாடி வினா', pl_tasks_tab: 'பணிகள்',
  login_title: 'கலாம் ஸ்பார்க்', login_subtitle: 'AI வாழ்க்கை வழிகாட்டி',
  login_email: 'உங்கள்@மின்னஞ்சல்.com', login_name: 'உங்கள் பெயர்',
  login_sign_in: 'உள்நுழை', login_register: 'பதிவு',
  login_sign_in_btn: 'உள்நுழைந்து ஒத்திசை', login_create_btn: 'கணக்கு உருவாக்கு',
  login_google: 'Google மூலம் தொடரவும்', login_or: 'அல்லது',
  login_cross_device: 'அனைத்து சாதனங்களிலும் ஒத்திசை • கடவுச்சொல் தேவையில்லை',
  login_restoring: 'அமர்வை மீட்டெடுக்கிறது...', login_creating: 'கணக்கு உருவாக்குகிறது...',
  days: 'நாட்கள்', of: 'இல்', complete: 'முடிந்தது',
};

const hi: Translations = {
  nav_dashboard: 'डैशबोर्ड', nav_roadmap: 'रोडमैप', nav_planner: 'प्लानर',
  nav_resources: 'संसाधन', nav_revision: 'रिवीज़न', nav_competitions: 'प्रतियोगिताएं',
  nav_mentor: 'AI मेंटर', nav_filespeaker: 'फ़ाइल स्पीकर', nav_logout: 'लॉग आउट',
  dash_welcome_back: 'वापस स्वागत है,', dash_working_towards: 'लक्ष्य की ओर',
  dash_refresh: 'रिफ्रेश', dash_level: 'स्तर', dash_streak: 'स्ट्रीक',
  dash_stage: 'चरण', dash_progress: 'प्रगति', dash_daily_inspiration: 'आज की प्रेरणा',
  dash_todays_tasks: 'आज के काम', dash_study_center: 'अध्ययन केंद्र',
  dash_ask_mentor: 'AI मेंटर से पूछें', dash_roadmap_progress: 'रोडमैप प्रगति',
  dash_view_plan: 'योजना देखें →', dash_rewards: 'मेरे पुरस्कार',
  dash_no_rewards: 'अभी कोई पुरस्कार नहीं — काम पूरा करें, चरण पूरे करें, क्विज़ दें!',
  dash_rewards_earn_hint: 'अपना पहला बैज कमाने के लिए आगे बढ़ें!',
  ob_setup_journey: 'आपकी यात्रा सेट करें', ob_whats_name: 'आपका नाम क्या है?',
  ob_your_background: 'आपकी पृष्ठभूमि', ob_education_level: 'शिक्षा स्तर',
  ob_choose_level: 'अपना स्तर चुनें...', ob_middle_school: 'मिडिल स्कूल (कक्षा 6–8)',
  ob_high_school: 'हाई स्कूल (कक्षा 9–12)', ob_college: 'कॉलेज छात्र',
  ob_self_learner: 'स्व-अध्ययन / कामकाजी', ob_graduate: 'स्नातकोत्तर',
  ob_school_board: 'स्कूल बोर्ड', ob_choose_board: 'बोर्ड चुनें...',
  ob_grade_semester: 'कक्षा / वर्ष / सेमेस्टर', ob_enter_grade: 'जैसे कक्षा 10, 2nd Year B.Tech...',
  ob_study_field: 'पसंदीदा विषय', ob_field_placeholder: 'जैसे विज्ञान, गणित, कला...',
  ob_city: 'आपका शहर (वैकल्पिक)', ob_city_placeholder: 'जैसे दिल्ली, मुंबई...',
  ob_study_hours: 'प्रतिदिन पढ़ाई के घंटे',
  ob_target_year: 'लक्ष्य किस वर्ष तक हासिल करना है?', ob_target_year_placeholder: 'जैसे 2026, 2027...',
  ob_motivation: 'यह करियर क्यों चाहते हैं? (वैकल्पिक)', ob_motivation_placeholder: 'जैसे देश की सेवा, आर्थिक स्वतंत्रता...',
  ob_dream_career: 'आपका सपना करियर', ob_dream_placeholder: 'जैसे IAS अधिकारी, डॉक्टर, इंजीनियर...',
  ob_not_sure: 'पक्का नहीं? ड्रीम डिस्कवरी क्विज़ लें',
  ob_career_summary: 'आपके सपने के करियर के बारे में', ob_about_your_career: 'एक बनने का मतलब:',
  ob_you_are_all_set: 'आप तैयार हैं!', ob_continue: 'आगे बढ़ें',
  ob_back: 'वापस', ob_step_of: 'चरण', ob_build_roadmap: 'स्वीकार करें और रोडमैप बनाएं',
  ob_view_roadmap: 'मेरा रोडमैप देखें',
  pl_todays_tasks: 'आज के काम', pl_sync_roadmap: 'रोडमैप सिंक करें',
  pl_add_task: 'काम जोड़ें...', pl_no_tasks: 'अभी कोई काम नहीं',
  pl_completed: 'पूर्ण', pl_all_done: 'आज का काम पूरा! 🎉',
  pl_quiz_tab: 'क्विज़', pl_tasks_tab: 'काम',
  login_title: 'कलाम स्पार्क', login_subtitle: 'AI करियर आर्किटेक्ट',
  login_email: 'आपका@ईमेल.com', login_name: 'आपका नाम',
  login_sign_in: 'लॉग इन', login_register: 'रजिस्टर',
  login_sign_in_btn: 'लॉग इन और सिंक', login_create_btn: 'खाता बनाएं',
  login_google: 'Google से जारी रखें', login_or: 'या',
  login_cross_device: 'सभी डिवाइस पर सिंक • पासवर्ड की जरूरत नहीं',
  login_restoring: 'सेशन वापस ला रहे हैं...', login_creating: 'खाता बना रहे हैं...',
  days: 'दिन', of: 'में से', complete: 'पूर्ण',
};

const te: Translations = {
  nav_dashboard: 'డాష్‌బోర్డ్', nav_roadmap: 'రోడ్‌మ్యాప్', nav_planner: 'ప్లానర్',
  nav_resources: 'వనరులు', nav_revision: 'పునర్విమర్శ', nav_competitions: 'పోటీలు',
  nav_mentor: 'AI మెంటర్', nav_filespeaker: 'ఫైల్ స్పీకర్', nav_logout: 'లాగ్ అవుట్',
  dash_welcome_back: 'తిరిగి స్వాగతం,', dash_working_towards: 'లక్ష్యం వైపు',
  dash_refresh: 'రిఫ్రెష్', dash_level: 'స్థాయి', dash_streak: 'స్ట్రీక్',
  dash_stage: 'దశ', dash_progress: 'పురోగతి', dash_daily_inspiration: 'నేటి స్ఫూర్తి',
  dash_todays_tasks: 'నేటి పనులు', dash_study_center: 'అధ్యయన కేంద్రం',
  dash_ask_mentor: 'AI మెంటర్‌ని అడగండి', dash_roadmap_progress: 'రోడ్‌మ్యాప్ పురోగతి',
  dash_view_plan: 'ప్లాన్ చూడు →', dash_rewards: 'నా బహుమతులు',
  dash_no_rewards: 'ఇంకా బహుమతులు లేవు — పనులు, దశలు పూర్తి చేయండి!',
  dash_rewards_earn_hint: 'మీ మొదటి బ్యాడ్జ్ సంపాదించడానికి కొనసాగండి!',
  ob_setup_journey: 'మీ ప్రయాణం సెటప్ చేద్దాం', ob_whats_name: 'మీ పేరు ఏమిటి?',
  ob_your_background: 'మీ నేపథ్యం', ob_education_level: 'విద్యా స్థాయి',
  ob_choose_level: 'మీ స్థాయి ఎంచుకోండి...', ob_middle_school: 'మిడిల్ స్కూల్ (6–8)',
  ob_high_school: 'హై స్కూల్ (9–12)', ob_college: 'కళాశాల విద్యార్థి',
  ob_self_learner: 'స్వయంగా నేర్చుకునే వ్యక్తి', ob_graduate: 'పోస్ట్ గ్రాడ్యుయేట్',
  ob_school_board: 'పాఠశాల బోర్డు', ob_choose_board: 'బోర్డు ఎంచుకోండి...',
  ob_grade_semester: 'తరగతి / సంవత్సరం', ob_enter_grade: 'ఉదా. 10వ తరగతి, 2వ సంవత్సరం...',
  ob_study_field: 'ఇష్టమైన సబ్జెక్ట్', ob_field_placeholder: 'ఉదా. సైన్స్, గణితం, కళలు...',
  ob_city: 'మీ నగరం (ఐచ్ఛికం)', ob_city_placeholder: 'ఉదా. హైదరాబాద్, విజయవాడ...',
  ob_study_hours: 'రోజుకు చదువు గంటలు',
  ob_target_year: 'లక్ష్యం చేరాల్సిన సంవత్సరం', ob_target_year_placeholder: 'ఉదా. 2026, 2027...',
  ob_motivation: 'ఈ కెరీర్ ఎందుకు కావాలి?', ob_motivation_placeholder: 'ఉదా. దేశ సేవ, ఆర్థిక స్వాతంత్ర్యం...',
  ob_dream_career: 'మీ కల కెరీర్', ob_dream_placeholder: 'ఉదా. IAS అధికారి, డాక్టర్...',
  ob_not_sure: 'తెలియదా? డ్రీమ్ డిస్కవరీ క్విజ్ తీసుకోండి',
  ob_career_summary: 'మీ కల కెరీర్ గురించి', ob_about_your_career: 'అర్థం:',
  ob_you_are_all_set: 'మీరు సిద్ధంగా ఉన్నారు!', ob_continue: 'కొనసాగించు',
  ob_back: 'వెనక్కి', ob_step_of: 'దశ', ob_build_roadmap: 'అంగీకరించి రోడ్‌మ్యాప్ తయారు చేయి',
  ob_view_roadmap: 'నా రోడ్‌మ్యాప్ చూడండి',
  pl_todays_tasks: 'నేటి పనులు', pl_sync_roadmap: 'రోడ్‌మ్యాప్ సింక్',
  pl_add_task: 'పని జోడించు...', pl_no_tasks: 'ఇంకా పనులు లేవు',
  pl_completed: 'పూర్తయినవి', pl_all_done: 'నేటి పనులు పూర్తి! 🎉',
  pl_quiz_tab: 'క్విజ్', pl_tasks_tab: 'పనులు',
  login_title: 'కళాం స్పార్క్', login_subtitle: 'AI కెరీర్ ఆర్కిటెక్ట్',
  login_email: 'మీ@ఇమెయిల్.com', login_name: 'మీ పేరు',
  login_sign_in: 'లాగిన్', login_register: 'నమోదు',
  login_sign_in_btn: 'లాగిన్ & సింక్', login_create_btn: 'ఖాతా తయారు చేయి',
  login_google: 'Google తో కొనసాగించు', login_or: 'లేదా',
  login_cross_device: 'అన్ని పరికరాలలో సింక్ • పాస్‌వర్డ్ అవసరం లేదు',
  login_restoring: 'సెషన్ తిరిగి తీసుకొస్తోంది...', login_creating: 'ఖాతా తయారవుతోంది...',
  days: 'రోజులు', of: 'లో', complete: 'పూర్తి',
};

const kn: Translations = {
  nav_dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', nav_roadmap: 'ರೋಡ್‌ಮ್ಯಾಪ್', nav_planner: 'ಪ್ಲಾನರ್',
  nav_resources: 'ಸಂಪನ್ಮೂಲಗಳು', nav_revision: 'ಪುನರಾವಲೋಕನ', nav_competitions: 'ಸ್ಪರ್ಧೆಗಳು',
  nav_mentor: 'AI ಮಾರ್ಗದರ್ಶಿ', nav_filespeaker: 'ಫೈಲ್ ಸ್ಪೀಕರ್', nav_logout: 'ಲಾಗ್ ಔಟ್',
  dash_welcome_back: 'ಮತ್ತೆ ಸ್ವಾಗತ,', dash_working_towards: 'ಗುರಿಯತ್ತ ಸಾಗುತ್ತಿದ್ದೀರಿ',
  dash_refresh: 'ರಿಫ್ರೆಶ್', dash_level: 'ಹಂತ', dash_streak: 'ಸ್ಟ್ರೀಕ್',
  dash_stage: 'ಹಂತ', dash_progress: 'ಪ್ರಗತಿ', dash_daily_inspiration: 'ಇಂದಿನ ಸ್ಫೂರ್ತಿ',
  dash_todays_tasks: 'ಇಂದಿನ ಕಾರ್ಯಗಳು', dash_study_center: 'ಅಧ್ಯಯನ ಕೇಂದ್ರ',
  dash_ask_mentor: 'AI ಮಾರ್ಗದರ್ಶಿ ಕೇಳಿ', dash_roadmap_progress: 'ರೋಡ್‌ಮ್ಯಾಪ್ ಪ್ರಗತಿ',
  dash_view_plan: 'ಯೋಜನೆ ನೋಡಿ →', dash_rewards: 'ನನ್ನ ಪಾರಿತೋಷಕಗಳು',
  dash_no_rewards: 'ಇನ್ನೂ ಪಾರಿತೋಷಕಗಳಿಲ್ಲ — ಕಾರ್ಯಗಳು, ಹಂತಗಳು ಮಾಡಿ!',
  dash_rewards_earn_hint: 'ಮೊದಲ ಬ್ಯಾಡ್ಜ್ ಗಳಿಸಲು ಮುಂದುವರಿಯಿರಿ!',
  ob_setup_journey: 'ನಿಮ್ಮ ಪ್ರಯಾಣ ಸಜ್ಜು ಮಾಡೋಣ', ob_whats_name: 'ನಿಮ್ಮ ಹೆಸರೇನು?',
  ob_your_background: 'ನಿಮ್ಮ ಹಿನ್ನೆಲೆ', ob_education_level: 'ಶಿಕ್ಷಣ ಮಟ್ಟ',
  ob_choose_level: 'ನಿಮ್ಮ ಮಟ್ಟ ಆರಿಸಿ...', ob_middle_school: 'ಮಿಡಲ್ ಸ್ಕೂಲ್ (6–8)',
  ob_high_school: 'ಹೈ ಸ್ಕೂಲ್ (9–12)', ob_college: 'ಕಾಲೇಜು ವಿದ್ಯಾರ್ಥಿ',
  ob_self_learner: 'ಸ್ವಯಂ ಕಲಿಕೆ', ob_graduate: 'ಸ್ನಾತಕೋತ್ತರ',
  ob_school_board: 'ಶಾಲಾ ಮಂಡಲಿ', ob_choose_board: 'ಮಂಡಲಿ ಆರಿಸಿ...',
  ob_grade_semester: 'ತರಗತಿ / ವರ್ಷ', ob_enter_grade: 'ಉದಾ. 10ನೇ ತರಗತಿ, 2ನೇ ವರ್ಷ...',
  ob_study_field: 'ಇಷ್ಟದ ವಿಷಯ', ob_field_placeholder: 'ಉದಾ. ವಿಜ್ಞಾನ, ಗಣಿತ...',
  ob_city: 'ನಿಮ್ಮ ನಗರ (ಐಚ್ಛಿಕ)', ob_city_placeholder: 'ಉದಾ. ಬೆಂಗಳೂರು...',
  ob_study_hours: 'ದಿನಕ್ಕೆ ಅಧ್ಯಯನ ಗಂಟೆಗಳು',
  ob_target_year: 'ಗುರಿ ಸಾಧಿಸಬೇಕಾದ ವರ್ಷ', ob_target_year_placeholder: 'ಉದಾ. 2026...',
  ob_motivation: 'ಈ ವೃತ್ತಿ ಏಕೆ ಬೇಕು?', ob_motivation_placeholder: 'ಉದಾ. ದೇಶ ಸೇವೆ...',
  ob_dream_career: 'ನಿಮ್ಮ ಕನಸಿನ ವೃತ್ತಿ', ob_dream_placeholder: 'ಉದಾ. IAS ಅಧಿಕಾರಿ, ವೈದ್ಯ...',
  ob_not_sure: 'ಖಚಿತವಿಲ್ಲವೇ? ಡ್ರೀಮ್ ಕ್ವಿಜ್ ತೆಗೆದುಕೊಳ್ಳಿ',
  ob_career_summary: 'ನಿಮ್ಮ ಕನಸಿನ ವೃತ್ತಿ ಬಗ್ಗೆ', ob_about_your_career: 'ಅರ್ಥ:',
  ob_you_are_all_set: 'ನೀವು ಸಿದ್ಧರಾಗಿದ್ದೀರಿ!', ob_continue: 'ಮುಂದುವರಿ',
  ob_back: 'ಹಿಂದೆ', ob_step_of: 'ಹಂತ', ob_build_roadmap: 'ಒಪ್ಪಿ ರೋಡ್‌ಮ್ಯಾಪ್ ಮಾಡಿ',
  ob_view_roadmap: 'ನನ್ನ ರೋಡ್‌ಮ್ಯಾಪ್ ನೋಡಿ',
  pl_todays_tasks: 'ಇಂದಿನ ಕಾರ್ಯಗಳು', pl_sync_roadmap: 'ರೋಡ್‌ಮ್ಯಾಪ್ ಸಿಂಕ್',
  pl_add_task: 'ಕಾರ್ಯ ಸೇರಿಸಿ...', pl_no_tasks: 'ಇನ್ನೂ ಕಾರ್ಯಗಳಿಲ್ಲ',
  pl_completed: 'ಮುಗಿದವು', pl_all_done: 'ಇಂದಿನ ಕಾರ್ಯ ಮುಗಿದಿದೆ! 🎉',
  pl_quiz_tab: 'ಕ್ವಿಜ್', pl_tasks_tab: 'ಕಾರ್ಯಗಳು',
  login_title: 'ಕಲಾಮ್ ಸ್ಪಾರ್ಕ್', login_subtitle: 'AI ವೃತ್ತಿ ವಾಸ್ತುಶಿಲ್ಪಿ',
  login_email: 'ನಿಮ್ಮ@ಇಮೇಲ್.com', login_name: 'ನಿಮ್ಮ ಹೆಸರು',
  login_sign_in: 'ಲಾಗಿನ್', login_register: 'ನೋಂದಣಿ',
  login_sign_in_btn: 'ಲಾಗಿನ್ & ಸಿಂಕ್', login_create_btn: 'ಖಾತೆ ತೆರೆಯಿರಿ',
  login_google: 'Google ಮೂಲಕ ಮುಂದುವರಿಯಿರಿ', login_or: 'ಅಥವಾ',
  login_cross_device: 'ಎಲ್ಲ ಸಾಧನಗಳಲ್ಲಿ ಸಿಂಕ್ • ಪಾಸ್‌ವರ್ಡ್ ಬೇಡ',
  login_restoring: 'ಸೆಶನ್ ಮರಳಿ ತರುತ್ತಿದ್ದೇವೆ...', login_creating: 'ಖಾತೆ ತಯಾರಾಗುತ್ತಿದೆ...',
  days: 'ದಿನಗಳು', of: 'ರಲ್ಲಿ', complete: 'ಮುಗಿದಿದೆ',
};

const ml: Translations = {
  nav_dashboard: 'ഡാഷ്‌ബോർഡ്', nav_roadmap: 'റോഡ്‌മാപ്പ്', nav_planner: 'പ്ലാനർ',
  nav_resources: 'വിഭവങ്ങൾ', nav_revision: 'പുനരവലോകനം', nav_competitions: 'മത്സരങ്ങൾ',
  nav_mentor: 'AI ഗൈഡ്', nav_filespeaker: 'ഫയൽ സ്പീക്കർ', nav_logout: 'ലോഗ് ഔട്ട്',
  dash_welcome_back: 'തിരിച്ചു സ്വാഗതം,', dash_working_towards: 'ലക്ഷ്യം നേടാൻ',
  dash_refresh: 'പുതുക്കുക', dash_level: 'തലം', dash_streak: 'സ്ട്രീക്ക്',
  dash_stage: 'ഘട്ടം', dash_progress: 'പുരോഗതി', dash_daily_inspiration: 'ഇന്നത്തെ പ്രചോദനം',
  dash_todays_tasks: 'ഇന്നത്തെ ജോലികൾ', dash_study_center: 'പഠന കേന്ദ്രം',
  dash_ask_mentor: 'AI ഗൈഡിനോട് ചോദിക്കൂ', dash_roadmap_progress: 'റോഡ്‌മാപ്പ് പുരോഗതി',
  dash_view_plan: 'പ്ലാൻ കാണുക →', dash_rewards: 'എന്റെ ഇനാമുകൾ',
  dash_no_rewards: 'ഇതുവരെ ഇനാമുകൾ ഇല്ല — ജോലികൾ, ഘട്ടങ്ങൾ, ക്വിസ് പൂർത്തിയാക്കൂ!',
  dash_rewards_earn_hint: 'ആദ്യ ബാഡ്ജ് നേടാൻ മുന്നോട്ട് പോകൂ!',
  ob_setup_journey: 'നിങ്ങളുടെ യാത്ര സജ്ജമാക്കാം', ob_whats_name: 'നിങ്ങളുടെ പേരെന്ത്?',
  ob_your_background: 'നിങ്ങളുടെ പശ്ചാത്തലം', ob_education_level: 'വിദ്യാഭ്യാസ നിലവാരം',
  ob_choose_level: 'നിങ്ങളുടെ നിലവാരം തിരഞ്ഞെടുക്കൂ...', ob_middle_school: 'മിഡിൽ സ്കൂൾ (6–8)',
  ob_high_school: 'ഹൈ സ്കൂൾ (9–12)', ob_college: 'കോളേജ് വിദ്യാർഥി',
  ob_self_learner: 'സ്വയം പഠിക്കുന്നവർ', ob_graduate: 'ബിരുദാനന്തര',
  ob_school_board: 'സ്കൂൾ ബോർഡ്', ob_choose_board: 'ബോർഡ് തിരഞ്ഞെടുക്കൂ...',
  ob_grade_semester: 'ക്ലാസ് / വർഷം', ob_enter_grade: 'ഉദാ. 10-ാം ക്ലാസ്, 2-ാം വർഷം...',
  ob_study_field: 'ഇഷ്ട വിഷയം', ob_field_placeholder: 'ഉദാ. ശാസ്ത്രം, ഗണിതം...',
  ob_city: 'നിങ്ങളുടെ നഗരം (ഐഛികം)', ob_city_placeholder: 'ഉദാ. കൊച്ചി, തിരുവനന്തപുരം...',
  ob_study_hours: 'ദിവസം പഠന മണിക്കൂർ',
  ob_target_year: 'ലക്ഷ്യം നേടേണ്ട വർഷം', ob_target_year_placeholder: 'ഉദാ. 2026, 2027...',
  ob_motivation: 'ഈ കരിയർ എന്തിന്?', ob_motivation_placeholder: 'ഉദാ. രാജ്യ സേവനം...',
  ob_dream_career: 'നിങ്ങളുടെ സ്വപ്ന കരിയർ', ob_dream_placeholder: 'ഉദാ. IAS ഓഫീസർ, ഡോക്ടർ...',
  ob_not_sure: 'ഉറപ്പില്ലേ? ഡ്രീം ഡിസ്കവറി ക്വിസ് എടുക്കൂ',
  ob_career_summary: 'നിങ്ങളുടെ സ്വപ്ന കരിയറിനെ കുറിച്ച്', ob_about_your_career: 'അർഥം:',
  ob_you_are_all_set: 'നിങ്ങൾ തയ്യാർ!', ob_continue: 'തുടരുക',
  ob_back: 'പിന്നോട്ട്', ob_step_of: 'ഘട്ടം', ob_build_roadmap: 'സ്വീകരിച്ച് റോഡ്‌മാപ്പ് തയ്യാറാക്കൂ',
  ob_view_roadmap: 'എന്റെ റോഡ്‌മാപ്പ് കാണൂ',
  pl_todays_tasks: 'ഇന്നത്തെ ജോലികൾ', pl_sync_roadmap: 'റോഡ്‌മാപ്പ് സിങ്ക്',
  pl_add_task: 'ജോലി ചേർക്കൂ...', pl_no_tasks: 'ഇതുവരെ ജോലികൾ ഇല്ല',
  pl_completed: 'പൂർത്തിയായവ', pl_all_done: 'ഇന്ന് എല്ലാം തീർന്നു! 🎉',
  pl_quiz_tab: 'ക്വിസ്', pl_tasks_tab: 'ജോലികൾ',
  login_title: 'കലാം സ്പാർക്ക്', login_subtitle: 'AI കരിയർ ആർക്കിടെക്ട്',
  login_email: 'നിങ്ങൾ@ഇമെയിൽ.com', login_name: 'നിങ്ങളുടെ പേര്',
  login_sign_in: 'ലോഗിൻ', login_register: 'രജിസ്റ്റർ',
  login_sign_in_btn: 'ലോഗിൻ & സിങ്ക്', login_create_btn: 'അക്കൗണ്ട് തുടങ്ങൂ',
  login_google: 'Google വഴി തുടരൂ', login_or: 'അല്ലെങ്കിൽ',
  login_cross_device: 'എല്ലാ ഡിവൈസിലും സിങ്ക് • പാസ്‌വേഡ് വേണ്ട',
  login_restoring: 'സെഷൻ തിരിച്ചെടുക്കുന്നു...', login_creating: 'അക്കൗണ്ട് ഉണ്ടാക്കുന്നു...',
  days: 'ദിവസം', of: 'ൽ', complete: 'പൂർത്തി',
};

const TRANSLATIONS: Record<LangCode, Translations> = { en, ta, hi, te, kn, ml };

const LANG_KEY = 'ks_lang';

export function getCurrentLang(): LangCode {
  return (localStorage.getItem(LANG_KEY) as LangCode) || 'en';
}

export function setCurrentLang(lang: LangCode): void {
  localStorage.setItem(LANG_KEY, lang);
}

export function t(key: TranslationKey, lang?: LangCode): string {
  const l = lang || getCurrentLang();
  return TRANSLATIONS[l]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
