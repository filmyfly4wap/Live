document.addEventListener('DOMContentLoaded', async () => {
      /********** Chrome check **********/
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      if (!isChrome) {
        const chromeModal = document.getElementById('chromeModal');
        chromeModal.classList.remove('hidden');
        chromeModal.setAttribute('aria-hidden', 'false');
        return; // block video setup in non-Chrome
      }

      /********** Your original Shaka player code **********/
      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        console.error('Browser not supported');
      } else {
        const video = document.querySelector('video');
        const player = new shaka.Player();
        await player.attach(video);

        const container = document.querySelector('.shaka-video-container');
        const ui = new shaka.ui.Overlay(player, container, video);

        ui.configure({
          controlPanelElements: [
            'play_pause', 'time_and_duration', 'mute', 'volume',
            'spacer', 'language', 'captions', 'picture_in_picture',
            'quality', 'fullscreen'
          ],
          volumeBarColors: {
            base: 'rgba(63, 187, 1, 1)',
            level: 'rgb(255, 69, 0)'
          },
          seekBarColors: {
            base: 'rgb(41, 41, 163)',
            buffered: 'rgb(35, 99, 3)',
            played: 'rgba(63, 187, 1, 1)'
          }
        });

        let drmConfig = {
          clearKeys: {
            "400131994b445d8c8817202248760fda": "2d56cb6f07a75b9aff165d534ae2bfc4"
          }
        };
        let cookieHeader = "__hdnea__=st=1759707007~exp=1759793407~acl=/*~hmac=606e5b236d74125622f1cf088c8ba6397a2bb70d5a14317484c9d5dcace582a2";
        let streamUrl = "https://jiotvmblive.cdn.jio.com/bpk-tv/Star_Sports_HD1_Hindi_BTS/output/index.mpd";

        try {
          const response = await fetch('https://raw.githubusercontent.com/alex4528/m3u/refs/heads/main/jstar.m3u');
          const m3uText = await response.text();
          const lines = m3uText.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Star_Sports_HD1')) {
              for (let j = i - 1; j >= 0; j--) {
                if (lines[j].startsWith('#EXTHTTP:')) {
                  const cookieMatch = lines[j].match(/"cookie":"([^"]+)"/);
                  if (cookieMatch) {
                    cookieHeader = cookieMatch[1];
                  }
                  break;
                }
              }
              break;
            }
          }
        } catch (error) {
          console.error('Failed to fetch M3U:', error);
        }

        player.configure({
          drm: drmConfig,
          streaming: {
            lowLatencyMode: true,
            bufferingGoal: 15,
            rebufferingGoal: 2,
            bufferBehind: 15,
            retryParameters: { timeout: 10000, maxAttempts: 5, baseDelay: 300, backoffFactor: 1.2 },
            segmentRequestTimeout: 8000,
            segmentPrefetchLimit: 2,
            useNativeHlsOnSafari: true
          },
          manifest: { retryParameters: { timeout: 8000, maxAttempts: 3 } }
        });

        player.getNetworkingEngine().registerRequestFilter((type, request) => {
          request.headers['Referer'] = 'https://www.jiotv.com/';
          request.headers['User-Agent'] = "plaYtv/7.1.5 (Linux;Android 13) ExoPlayerLib/2.11.6";
          request.headers['Cookie'] = cookieHeader;

          if (
            (type === shaka.net.NetworkingEngine.RequestType.MANIFEST ||
             type === shaka.net.NetworkingEngine.RequestType.SEGMENT) &&
            request.uris[0] && !request.uris[0].includes('__hdnea__=')
          ) {
            const separator = request.uris[0].includes('?') ? '&' : '?';
            request.uris[0] += separator + cookieHeader;
          }
        });

        try {
          await player.load(streamUrl);
        } catch (error) {
          console.error('Load error:', error);
        }
      }
    });
