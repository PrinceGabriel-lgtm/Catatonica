// ─── STATE (Pass 2.8) ───
// The app's shared state, formerly eight top-level `let`s in app.html's
// inline script. One object so every module reads and writes the same
// live values. Initial values are verbatim from Pass 2.0.4.
export const S = {
  currentUser: null,
  situations: [],
  archive: [],
  profile: {},
  activeSitId: null,
  sessMode: 'silence',
  sessDuration: 10,
  obsMode: 'manifesto',
};
