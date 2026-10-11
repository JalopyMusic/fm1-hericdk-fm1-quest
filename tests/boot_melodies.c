/* SPDX-License-Identifier: GPL-3.0-only */
/* Candidate power-on sounds: each plays a 3 s phrase through a factory preset and the whole mix (host build of the firmware DSP).
 *   argv[1]: output directory (one WAV a melody), argv[2]: the list "file engine preset name"
 *   cc -O2 -w -Ibuild/gen -Ifirmware/src -Ifirmware/hal tests/boot_melodies.c -lm -o build/snd/boot_melodies */
#define main hostsim_main
#include "hostsim.c"
#undef main

typedef struct { uint8_t step, note, len; } ev_t;           /* 1/16 steps at 80 BPM: 16 steps = 3.0 s */
typedef struct { const char *file, *name; uint8_t eng, pre; const ev_t *ev; uint8_t n; } mel_t;

#define EV(...) (const ev_t[]){__VA_ARGS__}
#define NN(a) (uint8_t)(sizeof(EV a) / sizeof(ev_t))
#define M(f, nm, e, p, ...) {f, nm, e, p, EV(__VA_ARGS__), NN((__VA_ARGS__))}
static const mel_t MEL[] = {
    /* FLUTE DUST (GRAIN engine 8, preset 2), 80 BPM, 1/16 steps = 187 ms: the current sound in sixteen openings, from 0.6 s to 3 s */
    M("c01", "FLUTE DUST · Atual · A C E D C · 3,0 s", 8, 2, {0, 69, 3}, {4, 72, 3}, {8, 76, 3}, {12, 74, 2}, {14, 72, 2}),
    M("c02", "FLUTE DUST · Curtinha · A C E · 0,9 s", 8, 2, {0, 69, 1}, {1, 72, 1}, {2, 76, 3}),
    M("c03", "FLUTE DUST · Dois toques · 0,9 s", 8, 2, {0, 72, 1}, {2, 79, 3}),
    M("c04", "FLUTE DUST · Subida rápida · 1,1 s", 8, 2, {0, 64, 1}, {1, 67, 1}, {2, 72, 1}, {3, 76, 3}),
    M("c05", "FLUTE DUST · Pergunta · 1,9 s", 8, 2, {0, 69, 2}, {3, 72, 2}, {6, 76, 4}),
    M("c06", "FLUTE DUST · Resposta descendo · 1,5 s", 8, 2, {0, 76, 2}, {2, 74, 1}, {3, 72, 1}, {4, 69, 4}),
    M("c07", "FLUTE DUST · Arpejo em Lá menor · 1,7 s", 8, 2, {0, 57, 1}, {1, 64, 1}, {2, 69, 1}, {3, 72, 1}, {4, 76, 1}, {5, 81, 4}),
    M("c08", "FLUTE DUST · Dórico de aventura · 2,2 s", 8, 2, {0, 62, 2}, {3, 65, 1}, {4, 69, 2}, {6, 72, 1}, {7, 74, 5}),
    M("c09", "FLUTE DUST · Chamada longa · 3,0 s", 8, 2, {0, 69, 2}, {3, 72, 2}, {6, 76, 3}, {10, 81, 6}),
    M("c10", "FLUTE DUST · Viagem · 3,0 s", 8, 2, {0, 64, 3}, {4, 67, 2}, {7, 71, 2}, {10, 74, 2}, {13, 76, 3}),
    M("c11", "FLUTE DUST · Eco · 3,0 s", 8, 2, {0, 76, 2}, {3, 72, 2}, {6, 69, 2}, {9, 76, 2}, {12, 72, 2}, {15, 69, 1}),
    M("c12", "FLUTE DUST · Subida e respiro · 3,0 s", 8, 2, {0, 60, 1}, {2, 64, 1}, {4, 67, 1}, {6, 72, 1}, {8, 76, 1}, {10, 79, 6}),
    M("c13", "FLUTE DUST · Oitava aberta · 3,0 s", 8, 2, {0, 57, 4}, {4, 69, 4}, {8, 81, 8}),
    M("c14", "FLUTE DUST · Trinado · 3,0 s", 8, 2, {0, 76, 1}, {1, 77, 1}, {2, 76, 1}, {3, 77, 1}, {4, 79, 3}, {8, 84, 8}),
    M("c15", "FLUTE DUST · Passo e salto · 3,0 s", 8, 2, {0, 67, 2}, {2, 69, 1}, {3, 72, 2}, {6, 79, 2}, {9, 76, 1}, {10, 72, 6}),
    M("c16", "FLUTE DUST · Alvorada · 3,0 s", 8, 2, {0, 72, 3}, {4, 76, 3}, {8, 79, 3}, {12, 84, 4}),
};

int main(int argc, char **argv)
{
    uint32_t m, b, n, i, nb = FS * 3u / CTL;
    int32_t o[2 * CTL];
    const uint32_t step = FS * 60u / 80u / 4u;
    char path[512];
    FILE *rep;
    if (argc < 3 || !(rep = fopen(argv[2], "w")))
        return 1;
    for (m = 0; m < sizeof MEL / sizeof MEL[0]; m++) {
        const mel_t *me = &MEL[m];
        uint32_t frames = 0;
        FILE *w;
        uint8_t held[128] = {0};
        uint32_t off_at[128] = {0};
        snprintf(path, sizeof path, "%s/%s.wav", argv[1], me->file);
        w = fopen(path, "wb");
        if (!w)
            return 1;
        wav_hdr(w, 0);
        host_tracks_init();
        song.g[G_BPM] = 80;
        host_preset(&trk[0], me->eng, me->pre);
        song.sel = 0;
        for (b = 0; b < FS / CTL; b++)
            mix_block(o, CTL);
        fprintf(rep, "%s %u %u %s\n", me->file, me->eng, me->pre, me->name);
        for (b = 0; b < nb; b++) {
            uint32_t s0 = b * CTL, s1 = s0 + CTL;
            for (n = 0; n < 128u; n++)
                if (held[n] && (off_at[n] < s1 || b >= nb * 4u / 5u)) {          /* the last 8 blocks: all released */
                    trk_note_off(&trk[0], n);
                    held[n] = 0;
                }
            for (i = 0; i < me->n; i++) {
                uint32_t at = me->ev[i].step * step;
                if (at >= s0 && at < s1) {
                    trk_note_on(&trk[0], me->ev[i].note, 100);
                    held[me->ev[i].note] = 1;
                    off_at[me->ev[i].note] = at + me->ev[i].len * step - step / 4u;
                }
            }
            mix_block(o, CTL);
            for (i = 0; i < CTL; i++) {
                wav_put(w, o[2 * i], o[2 * i + 1]);
                frames++;
            }
        }
        fseek(w, 0, SEEK_SET);
        wav_hdr(w, frames);
        fclose(w);
    }
    fclose(rep);
    return 0;
}
