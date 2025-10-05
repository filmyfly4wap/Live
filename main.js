const queryParams = new URLSearchParams(window.location.search);
        const name = queryParams.get('url');
        const keyId = queryParams.get('keyId');
        const key = queryParams.get('key');

        document.addEventListener('DOMContentLoaded', async () => {
            shaka.polyfill.installAll();

            if (!shaka.Player.isBrowserSupported()) {
                console.error('Browser not supported');
                return;
            }

            const video = document.querySelector('video');
            const player = new shaka.Player();
            await player.attach(video);

            const container = document.querySelector('.shaka-video-container');
            const ui = new shaka.ui.Overlay(player, container, video);

            const config = {
                controlPanelElements: [
                    'play_pause',
                    'time_and_duration',
                    'mute',
                    'volume',
                    'spacer',
                    'captions',
                    'quality',
                    'language',
                    'picture_in_picture',
                    'fullscreen',
                    'overflow_menu'
                ]
            };
            ui.configure(config);

            let drmConfig = {
                clearKeys: {
                [keyId]:key
                }
            };
 

            try {

                const response = await fetch('https://raw.githubusercontent.com/alex8875/m3u/refs/heads/main/jstar.m3u');

                const m3uText = await response.text();

                const lines = m3uText.split('\n');

                for (let i = 0; i < lines.length; i++) {

                     {

                        const clearKeyLine = lines[i + 1];

                        const clearKeyMatch = clearKeyLine.match(/license_key=([^:]+):([a-f0-9]+)/);

                           

  

                        const cookieLine = lines.find(line => line.startsWith('#EXTHTTP:'));

                        const cookieMatch = cookieLine.match(/"cookie":"([^"]+)"/);

                        if (cookieMatch) {

                            cookieHeader = cookieMatch[1];

                        } 
                        const urlLine =name;
                        {if (urlLine) 
                            streamUrl =urlLine;
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
                    retryParameters: {
                        timeout: 10000,
                        maxAttempts: 5,
                        baseDelay: 300,
                        backoffFactor: 1.2
                    },
                    segmentRequestTimeout: 8000,
                    segmentPrefetchLimit: 2,
                    useNativeHlsOnSafari: true
                },
                manifest: {
                    retryParameters: {
                        timeout: 8000,
                        maxAttempts: 3
                    }
                }
            });

            player.getNetworkingEngine().registerRequestFilter((type, request) => {
                request.headers['Referer'] = 'https://www.jiotv.com/';
                request.headers['User-Agent'] = "plaYtv/7.1.5 (Linux;Android 13) ExoPlayerLib/2.11.6";
                request.headers['Cookie'] = cookieHeader;

                if ((type === shaka.net.NetworkingEngine.RequestType.MANIFEST ||
                     type === shaka.net.NetworkingEngine.RequestType.SEGMENT) &&
                    !request.uris[0].includes('__hdnea__=')) {
                    const separator = request.uris[0].includes('?') ? '&' : '?';
                    request.uris[0] += separator + cookieHeader;
                }
            });

            const enableAutoplay = () => {
                video.setAttribute('autoplay', '');
                video.setAttribute('playsinline', '');
                video.autoplay = true;
            };

            const attemptAutoplay = async () => {
                try {
                    video.muted = false;
                    await video.play();
                    console.log('Unmuted autoplay successful');
                    return true;
                } catch (error) {
                    console.log('Unmuted autoplay failed:', error.message);
                    try {
                        video.muted = true;
                        await video.play();
                        console.log('Muted autoplay successful');
                        return true;
                    } catch (mutedError) {
                        console.log('Muted autoplay failed:', mutedError.message);
                        return false;
                    }
                }
            };

            player.addEventListener('error', (event) => {
                console.error('Shaka Player Error:', event.detail);
            });

            video.addEventListener('play', () => {
                if (window.self === window.top && !document.fullscreenElement && window.innerWidth <= 768) {
                    container.requestFullscreen().catch(() => {
                        console.log('Fullscreen request failed');
                    });
                }
            }, { once: true });

            video.addEventListener('loadedmetadata', () => {
                video.volume = 0.8;
            });

            let hasUserInteracted = false;
            const enableSoundOnInteraction = () => {
                if (!hasUserInteracted && video.muted) {
                    video.muted = false;
                    hasUserInteracted = true;
                    console.log('Sound enabled after user interaction');
                }
            };
            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.addEventListener(event, enableSoundOnInteraction, { once: true });
            });

            try {
                enableAutoplay();
                await player.load(streamUrl);
                if (video.readyState >= 3) {
                    await attemptAutoplay();
                } else {
                    video.addEventListener('canplay', attemptAutoplay, { once: true });
                    setTimeout(async () => {
                        if (video.paused) {
                            await attemptAutoplay();
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('Load error:', error);
            }

            video.addEventListener('loadstart', () => {
            });

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && video.paused) {
                    attemptAutoplay();
                }
            });
        });