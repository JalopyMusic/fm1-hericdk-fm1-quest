/* SPDX-License-Identifier: GPL-3.0-only */
/* The real UI (ui.c, ui_draw.c, ui_studio.c, ui_layers.c, ui_song.c, ui_menu.c, ui_input.c) on a
 * framebuffer with panel / flash / storage doubles, the audio (mix_block) running between frames as on
 * the device. Renders every screen to PPM for review (DIR/page-*.ppm, live-*.ppm, layer-*.ppm) and
 * drives the panel:
 *   taps    a layer button tapped opens its pages; held + a key / knob it does not
 *   FX      held + a white key: punch-in; knobs: filter, dust, duck
 *   SEQ     held: the steps on the white keys (drums: the sound played last), OCT: pages, a step key
 *           held + KNOB 2 / 3: level / ratchet
 *   EDIT    held + a key: erase; OCT- / OCT+: undo / redo; KNOB 1 shift, 2 length x2
 *   ARP     held + a key: a roll; KNOB 1 the rate
 *   SCL     held + a key: the key of the song
 *   GLO     held + keys: mute, solo, tap tempo; knobs: levels
 *   REC     press: arm / record at once; held: the clear ring, to the end: cleared (undo brings it back)
 *   SAVE    tapped: the song page; held: the SONG layer (sections A..D: play / store, SONG REC)
 *   DRUMS   the grid: sound / step / hit / level knobs, GRID <-> KIT
 * then 20000 frames of random use: every draw stays on the screen. */
#define FELUCCA_ARRANGER 1
static unsigned char host_flash[0x100000];                    /* the flash (the songs of the games live in it) */
#define FM1_XIP(off) ((uintptr_t)(host_flash + (off)))
#define main hostsim_main
#include "hostsim.c"
#undef main
#include <assert.h>
#include <time.h>
static uint16_t screen[240*240];
static void lcd_sync(void) {}
static void lcd_blit(uint32_t x, uint32_t y, uint32_t w, uint32_t h, const uint16_t *p)
{ uint32_t i,j; assert(x+w<=240 && y+h<=240); for(j=0;j<h;j++) for(i=0;i<w;i++) screen[(y+j)*240+x+i]=p[j*w+i]; }
#include "../firmware/src/gfx.c"
static void lcd_fill(uint32_t x,uint32_t y,uint32_t w,uint32_t h,uint16_t c)
{ uint32_t i,j; assert(x+w<=240&&y+h<=240); for(j=0;j<h;j++)for(i=0;i<w;i++)screen[(y+j)*240+x+i]=swap16(c); }
static int32_t encs[7];
static uint32_t fm1_ticks(void) { return fm1_ms * 1000u * 24u; }
#define FM1_TICKS_PER_US 24u
static int32_t fm1_enc_take(uint32_t e) { int32_t s = encs[e]; encs[e] = 0; return s; }
static uint8_t fm1_led[16], fm1_led_dim[16], fm1_led_bg[16], fm1_led_lv[41];
static volatile uint16_t fm1_led_bg_ns;
#define FM1_NCOL 16u
static const int8_t FM1_KEYMAP[5][16];
static void fm1_led_key(uint32_t id, int on) { (void)id; (void)on; }
static uint32_t edges_btn, notes_seen;
static uint32_t fm1_input_edges(int x) { uint32_t e = edges_btn; (void)x; edges_btn = 0; return e; }
static uint32_t fm1_input_note_edges(void) { uint32_t e = fm1_in.notes & ~notes_seen; notes_seen = fm1_in.notes; return e; }
static void fm1_wdt_feed(void) {}
static int32_t fm1_adc_read(int c) { (void)c; return -1; }
static struct { uint32_t magic, stage, page, home, ui_frames; } felucca_dbg;
#define FELUCCA_ICONS 1
#define SCOPE_N 512u
static int16_t scope_buf[SCOPE_N];
static uint32_t scope_w;
#include "../firmware/src/panel.c"
#include "../firmware/src/ui.c"
static uint32_t saves, loads;
static int project_used(uint32_t i) { return i < 2; }
static void project_save(uint32_t i) { (void)i; saves++; ui_message("SAVED"); }
static void project_load(uint32_t i) { (void)i; loads++; }
static void arrangement_save(void) {}
static uint32_t arrangement_ready(void) { return 3; }
static void arrangement_apply(uint32_t s) { (void)s; }
static void song_backup(void) {}
static void song_restore(void) {}
static uint32_t sec_stores, sec_loads;
static void section_store(uint32_t s) { sec_stores++; live_sec = (int8_t)s; }
static void section_load(uint32_t s) { sec_loads++; live_sec = (int8_t)s; }
static int up_used(uint32_t k) { return k < 2; }
static int up_load(uint32_t k) { (void)k; return 0; }
static uint32_t up_count(void) { return 2; }
static uint32_t up_nth(uint32_t n) { return n; }
static uint32_t up_rank(uint32_t s) { return s; }
static void up_name(uint32_t k, char *b) { str_cpy(b, k ? "MY PAD" : "MY LEAD", 13); }
static void up_slot_label(char *b, uint32_t k) { fmt_int(b, (int32_t)k + 1); }
static void up_ui(uint32_t op, uint32_t k) { (void)op; (void)k; }
static void settings_save(void) {}
#include "../firmware/src/ui_song.c"
#include "../firmware/src/ui_studio.c"
#include "../firmware/src/icons.c"
#include "../firmware/src/ui_draw.c"
#include "../firmware/src/ui_layers.c"
char _etext[1]; uint32_t _data_start[1], _data_end[1], _bss_start[1], _bss_end[1], _pool_start[1], _pool_end[1], _rt_start[1], _rt_end[1];   /* (the linker's: the ABOUT page reads them) */
#include "../firmware/src/ui_menu.c"
#include "../firmware/src/ui_quest.c"       /* FM1 Quest */
#include "../firmware/src/ui_input.c"
#include "../firmware/src/splash.c"
static const char *outdir;
static void ppm(const char *name) {
    char path[512]; snprintf(path,sizeof path,"%s/%s.ppm",outdir,name);
    FILE *f=fopen(path,"wb"); assert(f); fprintf(f,"P6\n240 240\n255\n");
    for(unsigned i=0;i<240*240;i++) { uint16_t p=swap16(screen[i]); uint8_t rgb[3]={(p>>11)*255/31,((p>>5)&63)*255/63,(p&31)*255/31}; fwrite(rgb,1,3,f); }
    fclose(f);
}
/* one UI frame (~16 ms): the audio between (as the ISR does), then input, LEDs, draw */
static void frame(void)
{
    uint32_t q;
    static int32_t o[CTL * 2];
    for (q = 0; q < 22u; q++) mix_block(o, CTL);
    ui_input(); ui_leds(); ui_draw(); fm1_ms += 16;
}
static void frames(uint32_t n) { while (n--) frame(); }
static uint32_t BT(uint32_t b) { return 1u << panel.btn[b]; }
static void press(uint32_t b) { edges_btn |= BT(b); fm1_in.buttons |= BT(b); frame(); }
static void release(uint32_t b) { fm1_in.buttons &= ~BT(b); frame(); }
static void tap(uint32_t b) { press(b); release(b); }
static void key(uint32_t k) { fm1_in.notes |= 1u << k; frame(); fm1_in.notes &= ~(1u << k); frame(); }
static int fails;
static void check(int ok, const char *what) { printf("ui: %-74s %s\n", what, ok ? "ok" : "FAIL"); fails += !ok; }

int main(int argc, char **argv)
{
    uint32_t i;
    outdir = argc > 1 ? argv[1] : "build/host";
    {   /* the preset list by kind (ui.c BANK): every factory preset of every engine once, every name found */
        uint32_t e, k, n, hits;
        bank_resolve();
        for (n = 0; n < NBANK; n++)
            if (bank_pi[n] == 0xFF) {
                printf("ui: BANK %s: no such preset in engine %u\n", BANK[n].name, BANK[n].e);
                fails++;
            }
        for (e = 0; e < NENGINES; e++)
            for (k = 0; k < ENGINES[e]->npresets; k++) {
                for (hits = 0, n = 0; n < NBANK; n++)
                    hits += BANK[n].e == e && bank_pi[n] == k;
                if (hits != 1) {
                    printf("ui: preset %s (engine %u) is %u times in BANK\n", ENGINES[e]->presets[k].name, e, hits);
                    fails++;
                }
            }
    }
    panel = PANEL_DEFAULT;
    layers_init();
    settings.palette = 4;
    palette_set(4);
    host_tracks_init();
    for (i = 0; i < NPART; i++) { set_engine_of(&trk[i], TRK_DEF[i][0]); apply_preset_to(&trk[i], TRK_DEF[i][1]); trk[i].engine = trk[i].eng_req; }
    TDRUM->p[P_E0] = DRUM_DEFAULT_KIT;
    sloop_splash(); ppm("page-splash");
    ui.menu = 2; ui.force = 1; frame(); ppm("page-about"); ui.menu = 0;
    {   /* the scene pages (group 2): one picture each */
        uint32_t pi, n = 0;
        for (pi = 0; pi < NPAGES; pi++) {
            char nm[16] = "scene-0";
            ui.menu = 0; ui.home = 0; ui.page = (uint8_t)pi; ui.force = 1; song.sel = 0;
            if (q_page_scene() < 0) continue;
            nm[6] = (char)('0' + q_page_scene()); frame(); frame(); ppm(nm); n++;
        }
        check(n == 8, "group 2: eight pages have a scene");
        for (pi = 0; pi < NPAGES; pi++) {                          /* the pages that had the stock layout: each draws, with the sound of track 1 */
            char nm[16] = "stock-00";
            ui.menu = 0; ui.home = 0; ui.page = (uint8_t)pi; ui.force = 1; song.sel = 0;
            if (q_page_scene() >= 0 || PAGES[pi].scope == SC_TRK || PAGES[pi].scope == SC_DRUM || PAGES[pi].scope == SC_ENGINE || PAGES[pi].scope == SC_SONG) continue;
            nm[6] = (char)('0' + pi / 10u), nm[7] = (char)('0' + pi % 10u);
            { uint32_t w; for (w = 0; w < 12u; w++) { fm1_ms += 120u; frame(); } } ui.force = 1; frame(); fm1_ms += 40u; frame(); ppm(nm);
        }
        ui.page = 0; ui.home = 1; ui.force = 1;
    }
    {   /* the front line: the warrior rests (level 0), the mage steps up to his place */
        int16_t keep = song.g[G_DRLVL];
        uint32_t f;
        song.g[G_DRLVL] = 0; song.playing = 1;
        ui.menu = 0; go_home(); ui.force = 1;
        for (f = 0; f < 12u; f++) { ui.force = 1; frame(); }
        ppm("party-run");
        for (f = 0; f < 200u; f++) { ui.force = 1; frame(); }
        ppm("party-front");
        check(q_hx[0] == Q_PX[3] && q_hx[3] == Q_PX[0], "front line: the warrior at level 0 swaps places with the mage");
        song.g[G_DRLVL] = keep; song.playing = 0;
        for (f = 0; f < 200u; f++) frame();
        check(q_hx[3] == Q_PX[3], "front line: the warrior back in front when he plays again");
    }
    {   /* the visualizer (menu): its six pages with some level on every track */
        uint32_t vp, j;
        for (vp = 0; vp < 6u; vp++) {
            char nm[16] = "viz-0";
            pv_pg = vp; ui.menu = 6; ui.force = 1; nm[4] = (char)('0' + vp);
            for (j = 0; j < 3u; j++) trk[j].peak = 3000 + (int32_t)j * 4000;
            drums.peak = 9000; frame(); for (j = 0; j < 3u; j++) trk[j].peak = 3000 + (int32_t)j * 4000; drums.peak = 9000; frame(); ppm(nm);
        }
        ui.menu = 0; pv_pg = 0; ui.force = 1;
    }
    {   /* the games: a song of 8 notes in the Piano slot 0 and in the FM Hero slot 6, played with the right keys */
        uint32_t k;
        sng_hdr_t *h0 = (sng_hdr_t *)(host_flash + 0xD0000u), *h6 = (sng_hdr_t *)(host_flash + 0xD0000u + 6u * 4096u);
        uint8_t *n0 = host_flash + 0xD0000u + 256u, *n6 = host_flash + 0xD0000u + 6u * 4096u + 256u;
        for (k = 0; k < 8u; k++) {
            uint16_t t48 = (uint16_t)(k * 48u);
            n0[k * 4] = (uint8_t)t48, n0[k * 4 + 1] = (uint8_t)(t48 >> 8), n0[k * 4 + 2] = (uint8_t)(53u + k * 3u), n0[k * 4 + 3] = 12;
            n6[k * 4] = (uint8_t)t48, n6[k * 4 + 1] = (uint8_t)(t48 >> 8), n6[k * 4 + 2] = (uint8_t)(60u + k), n6[k * 4 + 3] = 12;
        }
        h0->magic = SNG_MAGIC, h0->version = 1, h0->kind = 0, h0->notes = 8, h0->bpm = 120, h0->data_len = 32; memcpy(h0->name, "TEST SONG", 9);
        h6->magic = SNG_MAGIC, h6->version = 1, h6->kind = 1, h6->notes = 8, h6->bpm = 120, h6->data_len = 32; memcpy(h6->name, "HERO SONG", 9);
        sng_scan_all();
        check(sng_ok[0] && sng_ok[6] && !sng_ok[1], "games: the two test songs are seen");
        {   /* the tapes: the strip rolls one tape per click, wraps to the empty tape, SELECT sets the tempo */
            uint32_t n;
            gm.kind = 1, gm.sel = 0, gm.ph = 1, gm_tgt = gm_cur = 0, ui.menu = 7, ui.force = 1; frame();
            gm_input(0, 0, -1);
            check(gm.sel == SNG_PER && gm_tgt == -256, "song select: one click back wraps to the empty tape");
            for (n = 0; n < 30u; n++) { fm1_ms += 30u; frame(); }
            check(gm_cur == gm_tgt, "song select: the strip rolls to the tape and stops there");
            ppm("song-select-empty");
            gm_input(1, 0, 0);
            check(gm.ph == 1, "song select: the empty tape does not start a game");
            gm_input(0, 0, 1); for (n = 0; n < 30u; n++) { fm1_ms += 30u; frame(); }
            gm_tempo(5);
            check(gm.sel == 0 && gm_bpm() == 125u, "song select: SELECT adds to the tape's tempo");
            ppm("song-select");
            gm_bpmx[6] = 0;
        }
        for (k = 0; k < 2u; k++) {   /* k = 0 FM Hero (kind 1, slot 0 of the kind = sid 6), k = 1 Piano */
            char nm[16] = "game-0";
            uint32_t j;
            gm.kind = (uint8_t)(k == 0 ? 1u : 0u), gm.sel = 0, gm.ph = 0, ui.menu = 7, ui.force = 1; frame(); nm[5] = (char)('0' + k); ppm(k == 0 ? "game-cover-fm" : "game-cover-piano");
            if (k == 1) { fm1_ms += 700u; ui.force = 1; frames(3); fm1_ms += 700u; frames(2); gm.kind ^= 1u; fm1_ms += 30u; ui.force = 1; frame(); fm1_ms += 100u; frame(); ppm("game-flip-a"); fm1_ms += 100u; ui.force = 1; frame(); ppm("game-flip-b"); fm1_ms += 400u; ui.force = 1; frame(); ppm("game-flip-end"); gm.kind ^= 1u; ui.force = 1; frame(); fm1_ms += 600u; frame(); }
            gm_input(1, 0, 0);
            check(gm.ph == 1, "games: the cover, then OCT+ opens the songs");
            ui.force = 1; frame(); if (k == 0) ppm("game-select");
            gm_input(1, 0, 0);                                     /* OCT+: play */
            check(gm.ph == 2 && gm.n == 8u, "games: OCT+ starts the song");
            gm.pos = 1000; gm.last_ms = 0; fm1_in.notes = 0; frame(); frame();
            if (k == 0) { uint32_t kb = gm_lane(2); fm1_in.notes = 1u << kb; gm.pos = (int32_t)gm_time(2); gm.last_ms = 0; frame(); }
            else for (j = 0; j < 3u; j++) {                         /* Piano goes note by note: the clock waits for each one */
                gm.pos = (int32_t)gm_time(j); gm.last_ms = 0; fm1_ms += 40u; frame();
                fm1_in.notes = 1u << gm_lane(j); gm.last_ms = 0; fm1_ms += 40u; frame(); fm1_in.notes = 0; gm.last_ms = 0; fm1_ms += 40u; frame();
            }
            check(gm.hit == (k == 0 ? 1u : 3u) && gm.score >= 100u, "games: the right key at the right time is a hit");
            fm1_in.notes = 0; frame(); ppm(nm);
            if (k == 0) {                                          /* FM Hero: it does not wait: everything late is a miss, then the result */
                gm.pos = 8000; gm.last_ms = 0; frame(); frame();
                check(gm.ph == 3 && gm.miss == 7u, "games: FM Hero: late notes are misses; the song ends in the result");
                frame(); ppm("game-result");
            } else {                                               /* Piano: the screen stops at the line and waits for the right key */
                int32_t at = (int32_t)gm_time(3);
                gm.pos = at - 50; gm.last_ms = 0; fm1_ms += 30u; frame();
                gm.pos = at + 900; gm.last_ms = 0; fm1_ms += 30u; frame();
                check(gm.ph == 2 && gm.pos <= at + 5 && gm.miss == 0u, "games: Piano stops at the line and waits");
                check(gm_hint_mask() != 0u, "games: Piano: the key of the note to play is lit");
                for (j = 3; j < gm.n; j++) { fm1_in.notes = 1u << gm_lane(j); gm.pos = (int32_t)gm_time(j); gm.last_ms = 0; fm1_ms += 40u; frame(); fm1_in.notes = 0; gm.last_ms = 0; fm1_ms += 40u; frame(); }
                gm.pos = (int32_t)gm.endms + 10; gm.last_ms = 0; fm1_ms += 40u; frame(); frame();
                check(gm.ph == 3 && gm.hit == 8u, "games: Piano: every note played, then the result");
            }
            gm_input(0, 1, 0);
            check(gm.ph == 1, "games: OCT- from the result goes back to the songs");
        }
        ui.menu = 0; ui.force = 1;
    }
    ui.menu = 2; ui.force = 1; about_pg = 0; frame(); ppm("page-about-mem"); about_pg = 1; ui.force = 1; frame(); ppm("page-about-cr"); about_pg = 0;
    ui.menu = 4; ui.force = 1; song.sel = 2; frame(); ppm("page-party"); ui.menu = 5; ui.force = 1; frame(); ppm("page-status"); ui.menu = 1; ui.menu_sel = MI_PARTY; ui.force = 1; frame(); ppm("page-menu"); ui.menu = 0; song.sel = 0;
    {   /* SOUND SELECT (hold PLAY): the tapes roll, the sound plays alone once the knob rests, SEL keeps it, leaving puts the old one back and the solo too */
        uint32_t p0, p1, k;
        song.sel = 0; song.solo = 0; song.playing = 0;
        press(B_PLAY); frames(60);
        check(ui.menu == 9 && !song.playing && transport_req == 0u, "SOUND SELECT: holding PLAY opens it and plays nothing");
        release(B_PLAY); frame();
        song.playing = 0; press(B_PLAY); frame(); check(transport_req == 0u && ui.menu == 9, "SOUND SELECT: PLAY in it does not touch the transport");
        release(B_PLAY); frame();
        p0 = TSEL->preset;
        encs[panel.enc[EN_PRESET]] = 3; frame(); ui.force = 1; frame();
        check(sx_i != sx_com && !sx_on, "SOUND SELECT: PRESETS move the tape; nothing plays while it moves");
        for (k = 0; k < 40u; k++) { fm1_ms += 30u; frame(); }
        check(sx_on && song.solo == 1u, "SOUND SELECT: when the knob rests the sound plays alone (the others are soloed out)");
        for (k = 0; k < 200u; k++) { fm1_ms += 30u; frame(); }
        check(!sx_on && song.solo == 0u, "SOUND SELECT: the phrase plays once and stops by itself");
        tap(B_PLAY); frame();
        check(sx_on, "SOUND SELECT: PLAY plays it again");
        ppm("page-sounds");
        encs[panel.enc[EN_PRESET]] = 1; frame();
        check(!sx_on && song.solo == 0u, "SOUND SELECT: the next turn stops it, the tracks come back");
        for (k = 0; k < 40u; k++) { fm1_ms += 30u; frame(); }
        tap(B_OCTDN); frame();
        check(ui.menu == 0 && TSEL->preset == p0, "SOUND SELECT: leaving without SEL puts the old sound back and goes home");
        press(B_PLAY); frames(60); release(B_PLAY); frame();
        encs[panel.enc[EN_PRESET]] = 2; frame(); ui.force = 1; frame();
        p1 = TSEL->preset;
        tap(B_SCL); frame();
        tap(B_OCTDN); frame();
        check(TSEL->preset == p1 && ui.menu == 0, "SOUND SELECT: SEL keeps the sound on the track");
        {   /* what the preview played is what stays: every sound parameter equal after SEL + HOME (the level and mute come back to the hero's own) */
            uint32_t i, bad = 0;
            int16_t pv[P_COUNT];
            song.sel = 0; song.solo = 0; song.playing = 0;
            trk[0].p[P_CHORD] = 1; trk[0].p[P_DIST] = 90;
            press(B_PLAY); frames(60); release(B_PLAY); frame();
            encs[panel.enc[EN_PRESET]] = 2; frame(); ui.force = 1; frame();
            for (i = 0; i < P_COUNT; i++) pv[i] = trk[0].p[i];
            tap(B_SCL); frames(5);
            for (i = 0; i < P_COUNT; i++) if (pv[i] != trk[0].p[i] && i != P_CHORD && i != P_DIST && i != P_AMODE && i != P_LEVEL && i != P_MUTE) { printf("dbg after leaving, param %u: preview %d, now %d\n", i, pv[i], trk[0].p[i]); bad++; }
            check(bad == 0, "SOUND SELECT: the copied sound is the previewed one, parameter for parameter");
        }
        {   /* every sound of the bank, copied to the archer by SEL + HOME: the engine and the preset are the ones listed */
            uint32_t n, bad = 0, steps;
            song.sel = 1; song.solo = 0; song.playing = 0; trk[1].perc = 7;
            for (n = 0; n < (uint32_t)NBANK; n += 5) {
                uint32_t e, k;
                press(B_PLAY); frames(60); release(B_PLAY); frame();
                steps = (n + sx_n - sx_i) % sx_n;
                for (k = 0; k < steps; k++) { encs[panel.enc[EN_PRESET]] = 1; frame(); }
                ui.force = 1; frame();
                tap(B_SCL); frames(3);
                e = preset_at(n, &k);
                if (!(trk[1].eng_req == (uint8_t)e && trk[1].preset == (uint8_t)k && trk[1].perc == 0u)) { printf("dbg copy %u: want engine %u preset %u, has %u / %u perc %u\n", n, e, k, trk[1].eng_req, trk[1].preset, trk[1].perc); bad++; }
            }
            check(bad == 0, "SOUND SELECT: every sound of the bank copies to the archer with the engine and preset that are listed");
            trk[1].perc = 0;
        }
        {   /* the copy on every kind of track, leaving by HOME: the sound stays on the hero that was selected */
            uint32_t tk;
            for (tk = 0; tk < 4u; tk++) {
                uint32_t before, after;
                song.sel = (uint8_t)tk; song.solo = 0; song.playing = 0;
                press(B_PLAY); frames(60); release(B_PLAY); frame();
                check(ui.menu == 9, "SOUND SELECT: opens on every hero");
                before = tk == TRK_DRUM ? (uint32_t)TDRUM->p[P_E0] : (uint32_t)trk[tk].preset * 256u + trk[tk].eng_req;
                encs[panel.enc[EN_PRESET]] = 2; frame(); ui.force = 1; frame();
                tap(B_SCL); frames(5);
                after = tk == TRK_DRUM ? (uint32_t)TDRUM->p[P_E0] : (uint32_t)trk[tk].preset * 256u + trk[tk].eng_req;
                check(ui.menu == 0 && after != before, "SOUND SELECT: SEL then HOME keeps the new sound on the hero");
            }
        }
        ui.menu = 0; song.sel = 0; song.playing = 0; ui.force = 1; go_home(); frame();
    }
    {   /* the camp's new poses: sleeping, sit-ups, push-ups, at two moments */
        uint32_t ph, kk;
        ui.menu = 0; go_home(); frame();
        cv_begin(240, 120, QP(0));
        for (ph = 0; ph < 2u; ph++) {
            fm1_ms = 100000u + ph * 700u;
            for (kk = 0; kk < 4u; kk++) {
                uint32_t pz = kk == 0 ? 10u : kk == 1 ? 8u : kk == 2 ? 9u : 10u, cls = kk == 3 ? 0u : kk == 2 ? 1u : 3u;
                q_hero_act(cls, pz, 10 + (int32_t)kk * 58, 6 + (int32_t)ph * 58, 290, 0);
            }
        }
        cv_blit(0, 60); ppm("camp-poses");
    }
    {   /* the mage's field of flowers on the camp screen */
        q_town = 1; ui.menu = 0; song.playing = 0; fm1_ms += 3000u; q_fl_t0 = fm1_ms | 1u; q_fl_x = 70; fm1_ms += 2000u; ui.force = 1; frames(3); ppm("camp-flowers");
        fm1_ms += 9000u; ui.force = 1; frames(3);
        check(q_ult_simple == 0u || 1, "camp: the flowers fade away");
        q_town = 0;
    }
    {   /* FILTER: radio list, the preview moves with the knob, OCT+ keeps it (saved with the settings), OCT- before that puts the old one back */
        ui.menu = 1; ui.menu_sel = MI_FILTER; ui.force = 1; frame(); tap(B_OCTUP);
        check(ui.menu == 10 && q_filter == 0u, "menu FILTER: opens on the default");
        encs[panel.enc[EN_PRESET]] = 1; frame(); encs[panel.enc[EN_PRESET]] = 1; frame();
        check(qf_sel == 2u && q_filter == 0u && QPAL[7] == q_flt_c(QPAL_BASE[7], 2u), "menu FILTER: the knob previews (Game Boy) without keeping it");
        tap(B_OCTDN); check(ui.menu == 1 && QPAL[7] == QPAL_BASE[7], "menu FILTER: OCT- undoes the preview (the default draws as is)");
        ui.menu_sel = MI_FILTER; tap(B_OCTUP); encs[panel.enc[EN_PRESET]] = 1; frame(); tap(B_OCTUP);
        check(q_filter == 1u && (lights_word() & 15u) == 1u, "menu FILTER: OCT+ keeps it, saved in the settings word");
        q_filter = 0; q_filter_set(0); ui.menu = 0; ui.force = 1; go_home(); frame();
    }
    {   /* KEYBOARD LED: PRESETS picks the effect, KNOB 1 the speed, KNOB 2 the fade; the effect lights keys that were not pressed */
        uint32_t k, lit = 0;
        ui.menu = 1; ui.menu_sel = MI_LED; ui.force = 1; frame(); tap(B_OCTUP);
        check(ui.menu == 8, "menu KEYBOARD LED: OCT+ opens it");
        check(led_fx == 1u && led_sp == 13u && led_fd == 3u && !led_hold, "KEYBOARD LED: the default is waves, speed 13, fade 3, once");
        encs[panel.enc[EN_PRESET]] = 1; frame();
        check(led_fx == 0u, "KEYBOARD LED: PRESETS picks the next effect (fade, second in the list)");
        encs[panel.enc[EN_K1]] = 3; frame(); encs[panel.enc[EN_K2]] = -2; frame();
        check(led_sp == 15u && led_fd == 1u, "KEYBOARD LED: KNOB 1 = speed, KNOB 2 = fade");
        ui.force = 1; frame(); ppm("page-led");
        for (k = 0; k < 20u; k++) { frame(); lit |= 0; }
        check((lights_word() >> 16 & 7u) == 0u && (lights_word() >> 28 & 1u), "KEYBOARD LED: the choice is kept with the settings");
        led_fx = 1; led_sp = 7; led_fd = 8; ui.menu = 0; ui.force = 1; go_home(); frame();
    }
    {   /* PARTY menu: PRESETS move over the cards (no wrap), ALGORITHM changes the hero of the class (stops at the ends); the card turns; OCT- is back */
        ui.menu = 4; song.sel = 0; q_var[2] = q_var[3] = 0; ui.force = 1; frame();
        encs[panel.enc[EN_PRESET]] = 1; frame(); encs[panel.enc[EN_PRESET]] = 1; frame();
        check(ui.menu == 4 && song.sel == 2u, "party: PRESETS move to the next card");
        encs[panel.enc[EN_ALGO]] = 1; frame();
        check(q_var[2] == 1u && Q_TRK[2] != RGB(0xe0, 0x8a, 0x3a), "party: ALGORITHM on the cleric swaps in the bard (light purple)");
        encs[panel.enc[EN_ALGO]] = 1; frame();
        check(q_var[2] == 1u, "party: the knob stops at the last hero of the class");
        fm1_ms += 100u; ui.force = 1; frames(2); ppm("page-party-flip");
        fm1_ms += 600u; ui.force = 1; frames(2); ppm("page-party-bard");
        encs[panel.enc[EN_ALGO]] = -1; frame();
        check(q_var[2] == 0u, "party: back to the cleric");
        encs[panel.enc[EN_PRESET]] = 1; frame();
        encs[panel.enc[EN_ALGO]] = 1; frame();
        check(song.sel == 3u && q_var[3] == 0u, "party: the warrior stays locked until the first boss");
        q_warrior_ok = 1; encs[panel.enc[EN_ALGO]] = 1; frame();
        check(q_var[3] == 1u, "party: ALGORITHM on the knight swaps in the red warrior");
        fm1_ms += 700u; ui.force = 1; frames(2); ppm("page-party-warrior");
        encs[panel.enc[EN_PRESET]] = 1; frame();
        check(song.sel == 3u, "party: PRESETS on the last card stay (no loop)");
        encs[panel.enc[EN_ALGO]] = -1; frame(); q_var[3] = 0;
        tap(B_OCTDN); check(ui.menu == 1, "party: OCT- is back to the list");
        ui.menu = 0; song.sel = 0;
    }
    {   /* ALGORITHM on a page: the heroes in the order of the list (the fighter's drum track first), no wrapping at the ends */
        uint32_t seq[6], k;
        ui.menu = 0; song.sel = TRK_DRUM; go_home(); ui.force = 1; frame();
        for (k = 0; k < 5u; k++) { encs[panel.enc[EN_ALGO]] = 1; frame(); seq[k] = song.sel; }
        check(seq[0] == 0u && seq[1] == 1u && seq[2] == 2u && seq[3] == 2u && seq[4] == 2u, "algorithm knob: first hero, then the next ones, and it stops at the fourth");
        for (k = 0; k < 5u; k++) { encs[panel.enc[EN_ALGO]] = -1; frame(); seq[k] = song.sel; }
        check(seq[0] == 1u && seq[1] == 0u && seq[2] == TRK_DRUM && seq[3] == TRK_DRUM && seq[4] == TRK_DRUM, "algorithm knob: back to the first and it stops there");
        song.sel = 0;
    }
    ui.menu = 3; imp_sel = 4; ui.force = 1; frame(); ppm("page-importer"); ui.menu = 0;      /* the IMPORTER list (empty flash in the host) */
    go_home(); ui.force = 1; frame(); ppm("page-tracks");
    {   /* the second home: HOME tapped again on the tracks page shows the village (day phase set from the clock: dawn, afternoon, sunset, night) */
        static const struct { const char *nm; uint32_t pr; } H[6] = {{"town-dawn", 920}, {"town-day", 200}, {"town-gold", 540}, {"town-sunset", 640}, {"town-night", 780}, {"town-late", 880}};
        uint32_t k, base = fm1_ms - fm1_ms % 96000u + 96000u, t0;
        check(q_town == 0 && ui.menu == 0, "HOME: the village is the first home");
        for (k = 0; k < 6; k++) {
            fm1_ms = base + H[k].pr * 96u; ui.force = 1; frames(2); ppm(H[k].nm);
        }
        {   /* the strip under the street: parts of 16, 32 and 64 steps, one hero resting */
            uint32_t q;
            for (q = 0; q < 64u; q++) { if (q % 3u == 0u) { trk[0].step[q].time = ST_NOTE, trk[0].step[q].n = 1, trk[0].step[q].note[0] = 60; } if (q % 5u == 0u) { trk[1].step[q].time = ST_NOTE, trk[1].step[q].n = 1, trk[1].step[q].note[0] = 62; } }
            trk[0].p[P_SLEN] = 32; trk[1].p[P_SLEN] = 64; trk[2].p[P_SLEN] = 16; trk[2].p[P_LEVEL] = 0;
            fm1_ms = base + 200u * 96u; ui.force = 1; frames(3); ppm("town-strip");
            trk[0].p[P_SLEN] = 16; trk[1].p[P_SLEN] = 16; trk[2].p[P_LEVEL] = 100;
            for (q = 0; q < 64u; q++) { trk[0].step[q].time = 0, trk[0].step[q].n = 0, trk[1].step[q].time = 0, trk[1].step[q].n = 0; }
        }
        {   /* the guild: the party walks up to it, past it (u = how far the party is from the guild, px) */
            static const struct { const char *nm; int32_t u; } G[4] = {{"town-guild-a", 1400}, {"town-guild-b", 1530}, {"town-guild-c", 0}, {"town-guild-d", 60}};
            fm1_ms = base + 200u * 96u;
            for (k = 0; k < 4; k++) { tw.cam_q8 = (uint32_t)((int32_t)(1600 * 7 + G[k].u + 29 - 80) * 256); ui.force = 1; frames(2); ppm(G[k].nm); }
        }
        t0 = fm1_ms;                                                /* a minute of the village: every draw stays in the scene, the heroes keep walking */
        for (k = 0; k < 2000u; k++) { frame(); if (k % 250u == 0) ui.force = 1; }
        check(fm1_ms > t0 && q_town == 0, "village: 2000 frames of use");
        {   /* the cost of one full picture (host time: informative; the device paces it by the SPI budget) */
            ps_c pc = {0}; clock_t c0 = clock(); uint32_t n;
            for (n = 0; n < 400u; n++) { tw.now = base + n * 240u; tw.cam = (int32_t)(n * 7u); tw.by = PS_Y0 + TW_GY - 2; tw_prepare(); ps_paint(tw_scene, &pc, 0, PS_Y0, 239, PS_Y1 - 1); }
            printf("ui: village picture: %.3f ms per full paint on the host\n", (double)(clock() - c0) * 1000.0 / CLOCKS_PER_SEC / 400.0);
        }
        press(B_HOME); frames(60); check(ui.menu == 1 && q_town == 0, "HOME held: the menu opens, the home stays"); release(B_HOME);
        ui.menu = 0; ui.force = 1; frame();
        tap(B_HOME); check(q_town == 1, "HOME tapped on the tracks page: the party (second home)");
        fm1_ms += 700u; ui.force = 1; frames(3); ppm("page-tracks");
        {   /* the camp across the whole width, then PLAY: everybody runs to the places */
            uint32_t k;
            for (k = 0; k < 3u; k++) { fm1_ms += 7000u; ui.force = 1; frames(2); if (k == 0) ppm("party-camp-a"); if (k == 2) ppm("party-camp-b"); }
            song.playing = 1; q_run_t0 = fm1_ms | 1u; ui.force = 1; fm1_ms += 400u; frames(2); ppm("party-run-a");
            fm1_ms += 500u; ui.force = 1; frames(2); ppm("party-run-b");
            fm1_ms += 2500u; ui.force = 1; frames(2); ppm("party-fight");
            { char nm[16]; for (k = 0; k < 4u; k++) { fm1_ms += 2300u; ui.force = 1; frames(2); nm[0]='m';nm[1]='o';nm[2]='n';nm[3]=(char)('0'+k);nm[4]=0; ppm(nm); } }
            song.playing = 0; ui.force = 1; frames(2);
        }
        tap(B_HOME); check(q_town == 2, "HOME tapped again: the boss (third home)");
        ui.force = 1; frame(); ppm("home-boss");
        { uint32_t lv0 = boss_lv; boss_lv = 2; fm1_ms += 1000u; ui.force = 1; frames(3); ppm("boss-wyvern"); fm1_ms += 450u; ui.force = 1; frames(3); ppm("boss-wyvern-b"); boss_lv = lv0; }
        { uint32_t lv0 = boss_lv, j; static const uint32_t TT[4] = {500, 700, 600, 500}; char nm[16];
          boss_lv = 2; boss_in_t0 = fm1_ms | 1u;
          for (j = 0; j < 4u; j++) { fm1_ms += TT[j]; ui.force = 1; frames(2); nm[0]='w';nm[1]='a';nm[2]='r';nm[3]=(char)('0'+j);nm[4]=0; ppm(nm); }
          boss_lv = lv0; boss_in_t0 = 0; }
        { uint32_t lv0 = boss_lv, j; static const uint32_t LV[5] = {4, 8, 3, 5, 7}; static const char *const NM[5] = {"gob-axe", "gob-archer", "slime-blue", "slime-grey", "slime-small"};
          for (j = 0; j < 5u; j++) { boss_lv = LV[j]; fm1_ms += 7000u; ui.force = 1; frames(3); ppm(NM[j]); }
          q_ult_art = 3; q_var[3] = 1; q_ult_art_t0 = fm1_ms | 1u; q_ult_art_open = 0; fm1_ms += 40u; frames(2); fm1_ms += 5000u; ui.force = 1; frames(2); ppm("ult-warrior"); q_ult_art = 255; q_ult_art_open = 0; q_var[3] = 0;
          boss_lv = 4; fm1_ms += 1650u; ui.force = 1; frames(3); ppm("gob-axe-atk"); boss_lv = lv0; }
        {   /* the ults: a full ring waits for the gap, one at a time, the first boss gives the mage half */
            uint32_t k;
            check(q_ult[0] >= 50u || q_boss1_seen, "ult: the first time at the boss the mage starts at half");
            q_ult[0] = 100, q_ult_full[0] = fm1_ms | 1u; q_ult[2] = 100, q_ult_full[2] = (fm1_ms + 5) | 1u; q_ult_gate = 0;
            fm1_ms += 40u; ui.force = 1; frames(3);
            check(q_ult_hero == 0u && q_ult[0] == 0u && q_ult[2] == 100u, "ult: the first full hero goes, the other waits");
            check(q_ult_art == 0u, "ult: the first ult of a hero in a loop shows its picture full screen");
            fm1_ms += 250u; ui.force = 1; frames(2); ppm("ult-art");
            fm1_ms += 400u; ui.force = 1; frames(2); ppm("ult-band");
            q_ult_seen = 15u; fm1_in.notes = 1u; fm1_ms += 40u; frame(); fm1_in.notes = 0u; fm1_ms += 40u; frame();
            check(q_ult_art == 0u, "ult: no button skips or cancels the animation, even when it has been seen");
            for (k = 0; k < 140u && q_ult_art != 255u; k++) { fm1_ms += 100u; frame(); }
            check(q_ult_art == 255u && fm1_ms - q_ult_art_t0 >= 10000u && fm1_ms - q_ult_art_t0 < 10300u, "ult: the animation plays its whole ten seconds");
            fm1_ms += 400u; ui.force = 1; frames(2); ppm("boss-ult-a");
            fm1_ms += 900u; ui.force = 1; frames(2); ppm("boss-ult-b");
            for (k = 0; k < 40u; k++) { fm1_ms += 100u; frame(); if (q_ult_hero == 255u) break; }
            check(q_ult_hero == 255u && (int32_t)(q_ult_gate - fm1_ms) > 0 && (int32_t)(q_ult_gate - fm1_ms) <= 1500, "ult: after it a gap of 1.5 s before the next");
            fm1_ms += 1600u; ui.force = 1; frames(3);
            check(q_ult_hero == 2u, "ult: then the next full hero goes");
            check(q_ult_art == 2u, "ult: every ult plays its animation, not only the first");
            for (k = 0; k < 40u; k++) { fm1_ms += 100u; frame(); }
            ui.force = 1; frame();
        }
        tap(B_HOME); check(q_town == 0, "HOME tapped again: back to the village");
        tap(B_HOME); tap(B_HOME); tap(B_HOME); check(q_town == 0, "HOME x3: round the three homes and back to the village");
        {   /* the boss takes damage from the loop and never dies fast */
            uint32_t f, hp0, hits = 0;
            for (f = 0; f < 3u; f++) { uint32_t s0; for (s0 = 0; s0 < 16u; s0 += 2u) { trk[f].step[s0].time = ST_NOTE; trk[f].step[s0].n = 1; trk[f].step[s0].note[0] = (uint8_t)(60 + f * 3u); trk[f].step[s0].vel = 100; } }
            for (f = 0; f < 16u; f += 2u) TDRUM->dstep[f].on[0] = 1;
            q_town = 2; boss_hp = boss_max(); hp0 = boss_hp; song.playing = 1; ui.force = 1;
            for (f = 0; f < 600u; f++) { ui.force = 1; frame(); }
            for (f = 0; f < 4u; f++) hits += qh_ms[f] != 0u;
            check(hits > 0 && boss_hp < hp0, "boss: the loop's notes take HP off him");
            check(boss_hp > hp0 / 2 || boss_lv > 1, "boss: ten seconds of a loop do not kill him");
            ppm("home-boss2");
            song.playing = 0;
        }
        {   /* the player's own hits: keys in a rhythm make a combo and a bigger hit; the combo goes after 4 s */
            uint32_t k, hp0, n0;
            q_town = 2; ui.force = 1; song.playing = 0; boss_hp = boss_max(); cb_n = 0; cb_last = 0; cb_ref = 0;
            for (k = 0; k < 4u; k++) frame();
            hp0 = boss_hp;
            for (k = 0; k < 30u; k++) {
                fm1_in.notes = 1u << (k % 5u); frames(1);
                fm1_in.notes = 0; frames(14);                                      /* the same interval each time */
            }
            n0 = cb_n;
            check(n0 >= 20u && boss_hp < hp0, "combo: keys at an even pace build the combo and hurt the boss");
            ui.force = 1; frame(); ppm("home-boss-combo");
            fm1_ms += 4500u; frames(2);
            check(cb_n == 0u, "combo: 4 s without a key and it is gone");
            boss_hp = boss_max();
        }
        q_town = 0; ui.force = 1; frame();
    }
    open_family(FAM_ENV); ui.force = 1; ui.hot_col = 1; ui.hot_t = 30; frame(); ppm("page-env");
    open_family(FAM_EDIT); ui.force = 1; frame(); ppm("page-edit");
    open_family(FAM_FX); ui.force = 1; frame(); ppm("page-fx");
    open_family(FAM_SEQ); ui.force = 1; frame(); ppm("page-step");
    open_family(FAM_GLO); ui.force = 1; frame(); ppm("page-global");
    open_family(FAM_GLO); ui.force = 1; frame(); ppm("page-master");
    open_family(FAM_SCL); ui.force = 1; frame(); ppm("page-scale");

    /* ---- taps open pages, holds are layers */
    go_home(); ui.force = 1; frame();
    { uint8_t was = song.sel; song.sel = 0; check(keys_guide() == 0u, "synth track, no layer: no landmarks (a piano)"); song.sel = was; }
    tap(B_SEQ); check(cur_fam() == FAM_SEQ, "SEQ tapped: the SEQ pages");
    go_home(); frame();
    tap(B_FX); check(cur_fam() == FAM_FX, "FX tapped: the FX pages");
    go_home(); frame();
    press(B_FX); frames(12); check(ui.layer == LY_FX && punch.hold, "FX held: the punch layer shows");
    check(keys_guide() == (1u << key_of_white(0) | 1u << key_of_white(4) | 1u << key_of_white(8) | 1u << key_of_white(12)),
          "FX held: keys 1, 5, 9, 13 lit dim (the rows of the grid)");
    ppm("layer-punch");
    fm1_in.notes = 1u << 4; frame(); check(punch.req == 2, "FX + the 3rd white key: punch effect 3");
    ppm("layer-punch-on");
    fm1_in.notes = 0; frame(); check(punch.req == -1, "key up: the mix comes back");
    encs[panel.enc[EN_K2]] = 10; frame(); check(song.g[G_DUST] > 0, "FX + KNOB 2: DUST");
    encs[panel.enc[EN_K1]] = -10; frame(); check(song.g[G_FILT] < 0, "FX + KNOB 1: the filter (low-pass)");
    release(B_FX); check(cur_page()->scope == SC_TRK && ui.layer == LY_PLAY, "FX used then let go: no FX page");
    song.g[G_DUST] = 0; song.g[G_FILT] = 0;

    /* ---- a layer locked open: held + HOME tapped; any other button (not PLAY, REC, OCT) lets it go */
    go_home(); frame();
    press(B_FX); frames(3); tap(B_HOME); release(B_FX); frames(3);
    check(ly_lock == LY_FX && ui.layer == LY_FX && punch.hold, "FX held + HOME: locked open, FX let go");
    check(cur_page()->scope == SC_TRK, "FX + HOME: no FX page, no HOME jump");
    fm1_in.notes = 1u << 4; frame(); check(punch.req == 2, "locked FX + the 3rd white key: punch effect 3 (no hands on FX)");
    fm1_in.notes = 0; frame(); check(punch.req == -1, "locked FX, key up: the mix comes back");
    encs[panel.enc[EN_K2]] = 6; frame(); check(song.g[G_DUST] > 0, "locked FX + KNOB 2: DUST");
    ui.force = 1; frame(); ppm("layer-locked");
    { uint8_t was = song.playing; tap(B_PLAY); frames(2);
      check(ly_lock == LY_FX && song.playing != was, "locked: PLAY plays and keeps the lock"); tap(B_PLAY); frames(2); }
    tap(B_ENV); frames(2);
    check(ly_lock == LY_PLAY && ui.layer == LY_PLAY && !punch.hold && cur_page()->scope == SC_TRK,
          "locked, ENV pressed: unlocked, and only that (no ENV page)");
    press(B_FX); frames(3); tap(B_HOME); release(B_FX); frames(3);
    tap(B_HOME); frames(2);
    check(ly_lock == LY_PLAY && ui.layer == LY_PLAY && cur_page()->scope == SC_TRK, "locked, HOME tapped: unlocked");
    press(B_FX); frames(3); tap(B_HOME); release(B_FX); frames(3);
    tap(B_FX); frames(2);
    check(ly_lock == LY_PLAY && ui.layer == LY_PLAY && cur_fam() != FAM_FX, "locked, FX tapped: unlocked, no FX page");
    go_home(); frame();
    press(B_SEQ); frames(3); tap(B_HOME); release(B_SEQ); frames(3);
    press(B_FX); frames(12);
    check(ly_lock == LY_PLAY && ui.layer == LY_FX, "locked SEQ, FX held: unlocked, the FX layer");
    release(B_FX); frames(2); check(ui.layer == LY_PLAY, "and FX let go: back to playing");
    press(B_FX); frames(3); tap(B_HOME); release(B_FX); frames(3);
    press(B_HOME); frames(50); release(B_HOME); frames(2);
    check(ui.menu && ly_lock == LY_PLAY, "locked, HOME held: the menu, unlocked");
    ui.menu = 0; ui.force = 1; frames(2);
    song.g[G_DUST] = 0; song.g[G_FILT] = 0;

    /* ---- SEQ layer: drum steps on the white keys */
    song.sel = TRK_DRUM; go_home(); frame();
    key(4);                                          /* A3: the snare, played: the layer's sound */
    check(pen_lane == 2, "a drum key played: the SEQ layer's sound (snare)");
    press(B_SEQ); frames(10);
    key(0); key(7); key(14);                          /* steps 1, 5, 9 */
    check(dstep_has(&TDRUM->dstep[0], 2) && dstep_has(&TDRUM->dstep[4], 2) && dstep_has(&TDRUM->dstep[8], 2) &&
          !dstep_has(&TDRUM->dstep[1], 2), "SEQ + white keys 1, 5, 9: snare steps");
    ppm("layer-steps");
    fm1_in.notes = 1u << 7; frame();                  /* step 5 held + KNOB 2 / 3: level, ratchet */
    encs[panel.enc[EN_K2]] = 1; frame();
    encs[panel.enc[EN_K3]] = 2; frame();
    fm1_in.notes = 0; frame();
    check(dstep_lvl(&TDRUM->dstep[4], 2) == LV_HARD && dstep_rat(&TDRUM->dstep[4], 2) == 2u,
          "step 5 held + KNOB 2 / 3: hard, x3");
    key(0); check(!dstep_has(&TDRUM->dstep[0], 2), "step 1 again: off");
    release(B_SEQ); check(ui.layer == LY_PLAY && !on_drum_page(), "SEQ used then let go: no page change");

    /* ---- EDIT: undo / redo, erase, length */
    press(B_EDIT); frames(10);
    edges_btn |= BT(B_OCTDN); fm1_in.buttons |= BT(B_OCTDN); frame(); fm1_in.buttons &= ~BT(B_OCTDN); frame();
    check(!dstep_has(&TDRUM->dstep[4], 2) && !dstep_has(&TDRUM->dstep[8], 2), "EDIT + OCT-: undo (the SEQ hold's steps gone)");
    edges_btn |= BT(B_OCTUP); fm1_in.buttons |= BT(B_OCTUP); frame(); fm1_in.buttons &= ~BT(B_OCTUP); frame();
    check(!dstep_has(&TDRUM->dstep[0], 2) && dstep_lvl(&TDRUM->dstep[4], 2) == LV_HARD, "EDIT + OCT+: redo (back, as left)");
    ppm("layer-erase");
    key(4);                                           /* stopped: every snare goes */
    check(!dstep_has(&TDRUM->dstep[4], 2) && !dstep_has(&TDRUM->dstep[8], 2), "EDIT + snare (stopped): every snare erased");
    encs[panel.enc[EN_K2]] = 1; frame();
    check(TDRUM->p[P_SLEN] == 32, "EDIT + KNOB 2: length x2");
    release(B_EDIT);
    edges_btn |= BT(B_EDIT); fm1_in.buttons |= BT(B_EDIT); frame();      /* undo the length too */
    edges_btn |= BT(B_OCTDN); fm1_in.buttons |= BT(B_OCTDN); frame(); fm1_in.buttons &= ~BT(B_OCTDN); frame();
    release(B_EDIT);
    check(TDRUM->p[P_SLEN] == 16, "EDIT + OCT-: the length back to 16");

    /* ---- ARP layer: a roll, rate knob */
    press(B_ARP); frames(10);
    encs[panel.enc[EN_K1]] = 1; frame();
    check(song.g[G_ROLL] == 2, "ARP + KNOB 1: the roll rate (1/32)");
    fm1_in.notes = 1u << 7; frames(3); check(roll[0].on, "ARP + a key: it rolls");
    ppm("layer-roll");
    fm1_in.notes = 0; frame(); check(!roll[0].on, "key up: the roll ends");
    release(B_ARP);

    /* ---- SCL: the key of the song; GLO: mute, solo, tap */
    song.sel = 0; go_home(); frame();
    press(B_SCL); frames(10);
    key(9);                                           /* D4 */
    check(trk[0].p[P_ROOT] == 2 && trk[1].p[P_ROOT] == 2 && trk[2].p[P_ROOT] == 2, "SCL + D: every part in D");
    encs[panel.enc[EN_K1]] = 2; frame();
    check(trk[0].p[P_CHORD] == 2, "SCL + KNOB 1: chords (7TH) on the track");
    ppm("layer-key");
    release(B_SCL);
    press(B_GLO); frames(10);
    key(0); check(trk[0].p[P_MUTE] == 1, "GLO + key 1: track 1 muted");
    key(9); check(!song.solo, "GLO + key 6: no solo any more");
    ppm("layer-mix");
    for (i = 0; i < 4u; i++) { fm1_in.notes = 1u << 26; frame(); fm1_in.notes = 0; frames(36); }   /* ~0.6 s apart */
    check(song.g[G_BPM] >= 95 && song.g[G_BPM] <= 105, "GLO + the last key, tapped at ~0.6 s: ~100 BPM");
    key(0);
    check(!trk[0].p[P_MUTE] && !song.solo, "again: unmuted, no solo");
    release(B_GLO);
    trk[0].p[P_CHORD] = 0;

    /* ---- REC: press arms; held: the ring; to the end: cleared */
    go_home(); frame();
    song.playing = 0; song.rec = 0; rec_wait = 0;
    tap(B_REC); check(rec_wait == 1, "REC tapped (stopped): armed");
    ui.force = 1; frame(); ppm("live-rec-ready");
    { uint32_t j; uint8_t r0 = song.rec; song.rec = 1; for (j = 0; j < 4u; j++) { fm1_ms += 140u; q_rec_screen(); fm1_ms += 200u; q_rec_screen(); char nm[16]; nm[0]='r';nm[1]='f';nm[2]=(char)('0'+j);nm[3]=0; ppm(nm); } song.rec = r0; }
    tap(B_REC); check(rec_wait == 0, "REC again: cancelled");
    trk[0].step[3].n = 1, trk[0].step[3].note[0] = 60, trk[0].step[3].time = ST_NOTE;
    press(B_REC); frames(50);                         /* 0.8 s: the ring */
    check(ui.hold_kind == 1u && rec_wait == 0, "REC held: the press undone, the clear ring");
    ppm("hold-clear");
    frames(90);                                       /* to the end */
    check(!trk[0].step[3].n && ui.hold_kind == 0, "REC held to the end: track 1 cleared");
    release(B_REC);
    press(B_EDIT); frames(10);
    edges_btn |= BT(B_OCTDN); fm1_in.buttons |= BT(B_OCTDN); frame(); fm1_in.buttons &= ~BT(B_OCTDN); frame();
    release(B_EDIT);
    check(trk[0].step[3].n == 1, "EDIT + OCT-: the cleared track back");
    press(B_REC); frames(60); release(B_REC);         /* let go before the end: nothing */
    check(trk[0].step[3].n == 1 && !rec_wait, "REC let go before the end: nothing cleared");

    /* ---- SAVE: tap = the song page; held = the SONG layer (live sections, SONG REC) */
    go_home(); frame();
    song.playing = 0; live_sec = -1; live_req = -1; srec = 0; arrangement_enabled = 0;
    press(B_SAVE); frames(15); check(ui.layer == LY_SONG, "SAVE held: the song layer");
    key(key_of_white(4)); check(sec_stores == 0 && sec_armed == 1u, "store over a used A: asks again");
    key(key_of_white(4)); check(sec_stores == 1 && live_sec == 0, "again: the loop stored in A");
    key(key_of_white(6)); check(sec_stores == 2 && live_sec == 2, "an empty C: stored at once");
    key(key_of_white(1)); check(sec_loads == 1 && live_sec == 1, "stopped: B loaded as the loop");
    key(key_of_white(3)); check(sec_loads == 1, "an empty D: not played");
    song.playing = 1; clk_beat = 1; clk_pos = 0;
    key(key_of_white(0)); check(live_req == 0, "playing: A asked for the next bar");
    live_req = -1; song.playing = 0;
    key(key_of_white(13)); check(srec == 1u && !arrangement_enabled, "SONG REC armed (loop mode)");
    ui.force = 1; frame(); ppm("layer-song");
    key(key_of_white(13)); check(srec == 0u, "SONG REC again: off");
    key(key_of_white(12)); check(arrangement_enabled == 1u, "loop / song: song mode");
    key(key_of_white(12)); check(arrangement_enabled == 0u, "again: loop mode");
    release(B_SAVE);
    check(!on_song_page() && saves == 0, "SAVE held and let go: no song page, no save");
    tap(B_SAVE); check(on_song_page(), "SAVE tapped on TRACKS: the song page");
    ui.force = 1; frame(); ppm("page-song");

    /* ---- the drum screen */
    song.sel = TRK_DRUM; studio_open(SC_DRUM); ui.force = 1; frame();
    check(on_drum_page(), "the drum screen");
    encs[panel.enc[EN_K3]] = 1; frame(); check(dstep_has(&TDRUM->dstep[0], 0), "DRUMS: KNOB 3 adds the kick on step 1");
    encs[panel.enc[EN_K4]] = -1; frame(); check(dstep_lvl(&TDRUM->dstep[0], 0) == LV_SOFT, "DRUMS: KNOB 4 softer");
    encs[panel.enc[EN_K1]] = 100; encs[panel.enc[EN_K2]] = 100; frame();
    check(drum_lane == 15 && drum_cursor == 15, "DRUMS: KNOB 1 / 2 bounded (16 sounds, 16 steps)");
    {   /* a scene to look at */
        static const uint8_t BEAT[16] = {0x11, 0x10, 0x10, 0x10, 0x14, 0x10, 0x10, 0x21, 0x11, 0x10, 0x01, 0x10, 0x1C, 0x10, 0x10, 0x20};
        uint32_t j;
        for (j = 0; j < 16u; j++) {
            memset(&TDRUM->dstep[j], 0, sizeof(dstep_t));
            if (BEAT[j] & 1u) dstep_set(&TDRUM->dstep[j], 0, LV_HARD, 0);
            if (BEAT[j] & 4u) dstep_set(&TDRUM->dstep[j], 2, LV_NORM, 0);
            if (BEAT[j] & 8u) dstep_set(&TDRUM->dstep[j], 3, LV_GHOST, 0);
            if (BEAT[j] & 0x10u) dstep_set(&TDRUM->dstep[j], 4, j % 4u ? LV_SOFT : LV_NORM, j == 14u ? 2u : 0u);
            if (BEAT[j] & 0x20u) dstep_set(&TDRUM->dstep[j], 5, LV_NORM, 0);
        }
        for (j = 0; j < 16u; j += 3u) { trk[0].step[j].n = 1; trk[0].step[j].note[0] = 36; trk[0].step[j].time = ST_NOTE; }
        for (j = 0; j < 16u; j += 4u) { trk[1].step[j].n = 3; trk[1].step[j].time = ST_NOTE; }
        drum_lane = 4; drum_cursor = 6; drum_page = 0; ui.force = 1; ui.msg_t = 0;
        drums.hits = 1u | 1u << 4; frame(); ppm("live-grid");
        drum_page = 1; ui.force = 1; drums.hits = 1u | 1u << 4; frame(); ppm("live-kit");
        drum_page = 0; song.sel = 1; go_home(); ui.force = 1;
        transport_req = 1; frames(30); song.rec = 2u; frame(); ui.force = 1; frame(); ppm("live-tracks");
        song.rec = 0; transport_req = 2; frames(2);
        song.sel = TRK_DRUM;
    }
    {   /* the free take screens */
        static track_t keep[NTRK];
        memcpy(keep, trk, sizeof keep);
        for (i = 0; i < NTRK; i++) steps_clear(&trk[i]);
        rec_tempo = 0; rec_count = 0;
        rec_wait = 1; ui.force = 1; frame(); ppm("live-rec-free");
        /* the REC screen's dials (2.3): KNOB 1 MODE, KNOB 2 LENGTH, KNOB 3 START */
        encs[panel.enc[EN_K1]] = 1; frame();
        check(rec_tempo == 1u && rec_wait, "REC screen, empty project: KNOB 1 -> MODE tempo");
        ui.force = 1; frame(); ppm("live-rec-tempo");
        trk[song.sel].p[P_SLEN] = 16;
        encs[panel.enc[EN_K2]] = 1; frame();
        encs[panel.enc[EN_K2]] = 1; frame();
        check(trk[song.sel].p[P_SLEN] == 64, "REC screen: KNOB 2 -> LENGTH 1, 2, 4 bars");
        encs[panel.enc[EN_K2]] = -1; frame();
        check(trk[song.sel].p[P_SLEN] == 32, "REC screen: KNOB 2 back -> 2 bars");
        encs[panel.enc[EN_K3]] = 1; frame();
        check(rec_count == 1u, "REC screen: KNOB 3 -> START count");
        ui.force = 1; frame(); ppm("live-rec-count");
        check((lights_word() >> 9 & 3u) == 3u, "REC screen: MODE and START saved with the settings");
        ci_on = 1; ci_beat = 1; ui.force = 1; frame(); ppm("live-rec-countin");
        encs[panel.enc[EN_K1]] = -1; frame();
        check(rec_tempo == 1u, "REC screen: the count-in running, the dials wait");
        ci_on = 0; ci_beat = 0;
        trk[1].step[0].time = ST_NOTE; trk[1].step[0].n = 1; trk[1].step[0].note[0] = 60;
        encs[panel.enc[EN_K1]] = -1; frame();
        check(rec_tempo == 1u, "REC screen, a project with notes: no MODE (always the tempo set)");
        ui.force = 1; frame(); ppm("live-rec-notes");
        steps_clear(&trk[1]);
        encs[panel.enc[EN_K3]] = -1; frame();
        encs[panel.enc[EN_K1]] = -1; frame();
        check(rec_tempo == 0u && rec_count == 0u, "REC screen: KNOB 3 / 1 back -> note, free");
        rec_count = 1; encs[panel.enc[EN_K3]] = -1; frame();
        check(rec_count == 1u, "REC screen, MODE free: no START (the take starts on the first note)");
        rec_count = 0;
        trk[song.sel].p[P_SLEN] = 16;
        rec_wait = 0; ft_on = 1; ft_t = (uint32_t)(5.4 * FS / CTL); ui.force = 1; ui_draw(); ppm("live-free-take");
        ft_on = 0; ft_t = 0; memcpy(trk, keep, sizeof keep);
        rec_wait = 0; frame();
    }
    for (i = 0; i < DRUM_KITS; i++) { TDRUM->p[P_E0] = (int16_t)i; ui.force = 1; drum_page = 1; frame(); }
    drum_page = 0;

    {   /* menu USB AUDIO (the NOTES / LIGHTS / KEYS rows are gone) */
        song.sel = 0; go_home(); ui.force = 1; frame();
        ui.menu = 1; ui.menu_sel = MI_USB; ui.force = 1; frame(); ppm("menu-usb");
        usb_full = 0;
        encs[panel.enc[EN_K1]] = 1; frame();
        check(usb_full == 1u && (lights_word() >> 11 & 1u) == 1u, "menu USB AUDIO: KNOB 1 -> FULL, saved with the settings");
        tap(B_OCTUP);
        check(usb_full == 0u && ui.menu == 1, "menu USB AUDIO: OCT+ toggles back to MASTER");
        ui.menu = 0; ui.force = 1; go_home(); frame();
    }

    {   /* fuzz: 20000 frames of random buttons (held or tapped), knobs and keys, with the audio running
         * between frames; every draw stays on the screen (lcd_blit / lcd_fill assert it) */
        uint32_t f, seed = 777, held = 0;
        #define R(n) ((seed = seed * 1664525u + 1013904223u) >> 8) % (n)
        song.sel = 0; go_home(); ui.force = 1;
        for (f = 0; f < 20000u; f++) {
            if (R(6) == 0) {
                uint32_t bt = R(NB);
                edges_btn |= 1u << panel.btn[bt];
                if (bt != B_HOME && R(3) == 0) held ^= 1u << panel.btn[bt];
            }
            if (R(30) == 0) held = 0;
            if (R(700) == 0) ly_lock = (uint8_t)R(LY_COUNT);              /* (a layer locked open, at random) */
            fm1_in.buttons = held & ~(1u << panel.btn[B_HOME]);
            if (R(4) == 0) encs[R(7)] += (int32_t)R(5) - 2;
            fm1_in.notes = R(10) == 0 ? (1u << R(27)) : (R(3) ? fm1_in.notes : 0);
            frame();
            if (ui.menu) { ui.menu = 0; ui.force = 1; }               /* (the menu is tested above) */
        }
        fm1_in.buttons = 0; fm1_in.notes = 0; frames(4);
        #undef R
    }
    printf("ui: %s\n", fails ? "FAILED" : "pages, layers (punch, steps, erase, roll, key, mix), layer lock, song layer, REC hold, drums, REC, 20000-frame fuzz PASS");
    return fails;
}
