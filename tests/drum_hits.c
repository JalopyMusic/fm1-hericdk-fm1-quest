/* SPDX-License-Identifier: GPL-3.0-only */
/* One hit of every sound of every synthesised kit, and a samba groove a kit, as WAVs (for the sounds page).
 *   argv[1]: output directory, argv[2]: list "kit lane file"; build with -I<dir of an alternate felucca_drumkits.h> first.
 *   cc -O2 -w -I<alt> -Ibuild/gen -Ifirmware/src -Ifirmware/hal tests/drum_hits.c -lm -o drum_hits */
#define main hostsim_main
#include "hostsim.c"
#undef main
static const uint8_t DS_NOTE[DS_LANES] = {36, 38, 39, 42, 46, 43, 48, 49, 51, 70, 63, 37, 56, 75, 35, 40};   /* one GM note per synth lane */
static void put(FILE *w, int32_t *l, int32_t *r, uint32_t *frames)
{
    uint32_t k;
    for (k = 0; k < CTL; k++) {
        int32_t a = clamp(l[k], -32767, 32767), b = clamp(r[k], -32767, 32767);
        wav_put(w, a, b);
        (*frames)++;
    }
}
static void render(FILE *w, uint32_t blocks, uint32_t *frames)
{
    int32_t l[CTL], r[CTL], rv[CTL];
    uint32_t j;
    for (j = 0; j < blocks; j++) {
        memset(l, 0, sizeof l), memset(r, 0, sizeof r), memset(rv, 0, sizeof rv);
        drums_render(l, r, rv, CTL);
        put(w, l, r, frames);
    }
}
int main(int argc, char **argv)
{
    uint32_t kit, lane, j;
    char path[512];
    FILE *rep;
    host_tracks_init();
    if (argc < 3 || !(rep = fopen(argv[2], "w"))) return 1;
    for (kit = DRUM_SAMPLED; kit < DRUM_KITS; kit++) {
        for (lane = 0; lane < DS_LANES; lane++) {
            FILE *w;
            uint32_t frames = 0;
            snprintf(path, sizeof path, "%s/k%u_l%u.wav", argv[1], kit, lane);
            w = fopen(path, "wb");
            wav_hdr(w, 0);
            memset(&drums, 0, sizeof drums);
            drums.set = -2;
            TDRUM->p[P_E0] = (int16_t)kit;
            song.g[G_DRLVL] = 100;
            drum_on(DS_NOTE[lane], 110);
            render(w, FS * 14u / 10u / CTL, &frames);
            fseek(w, 0, SEEK_SET);
            wav_hdr(w, frames);
            fclose(w);
            fprintf(rep, "%u %u k%u_l%u %s\n", kit, lane, kit, lane, DRUM_KIT_NAMES[kit]);
        }
        {   /* a samba groove, two bars at 100 BPM: the surdo on 2 and 4, the caixa in sixteenths, the tamborim 3+3+3+3+2+2, the agogo, the ganza */
            static const uint8_t SURDO[] = {4, 12}, RESP[] = {0, 8}, TAMB[] = {0, 3, 6, 9, 12, 14}, AGO[] = {0, 3, 6, 10, 12}, PAND[] = {2, 6, 10, 14};
            FILE *w;
            uint32_t frames = 0, step = FS * 60u / 100u / 4u, s, i;
            snprintf(path, sizeof path, "%s/groove_k%u.wav", argv[1], kit);
            w = fopen(path, "wb");
            wav_hdr(w, 0);
            memset(&drums, 0, sizeof drums);
            drums.set = -2;
            TDRUM->p[P_E0] = (int16_t)kit;
            song.g[G_DRLVL] = 100;
            for (s = 0; s < 32u; s++) {
                uint32_t st = s % 16u;
                for (i = 0; i < sizeof SURDO; i++) if (SURDO[i] == st) drum_on(DS_NOTE[14], 112);     /* KICK2 */
                for (i = 0; i < sizeof RESP; i++) if (RESP[i] == st) drum_on(DS_NOTE[5], 100);        /* TOMLO */
                drum_on(DS_NOTE[1], st % 4u == 0u ? 96 : 60);                                         /* SNARE every sixteenth */
                for (i = 0; i < sizeof TAMB; i++) if (TAMB[i] == st) drum_on(DS_NOTE[15], 104);       /* SNARE2 */
                for (i = 0; i < sizeof AGO; i++) if (AGO[i] == st) drum_on(DS_NOTE[i % 2u ? 13 : 12], 100);
                for (i = 0; i < sizeof PAND; i++) if (PAND[i] == st) drum_on(DS_NOTE[8], 90);
                if (st % 2u == 1u) drum_on(DS_NOTE[4], 70);                                           /* the ganza on the offbeats */
                { uint32_t blocks = step / CTL; render(w, blocks, &frames); }
            }
            render(w, FS / CTL, &frames);
            fseek(w, 0, SEEK_SET);
            wav_hdr(w, frames);
            fclose(w);
            fprintf(rep, "%u 99 groove_k%u %s\n", kit, kit, DRUM_KIT_NAMES[kit]);
        }
    }
    fclose(rep);
    return 0;
}
