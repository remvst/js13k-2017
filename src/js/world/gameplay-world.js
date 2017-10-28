class GameplayWorld extends World {

    initialize() {
        G.levelId++;

        const rows = 20 + G.levelId * 10;
        const cols = 20 + G.levelId * 10;

        W.matrix = generate(rows, cols);

        W.symSquad(
            evaluate(GRID_SIZE * (GRID_EMPTY_PADDING / 2 + GRID_OBSTACLE_PADDING + 2)),
            evaluate(GRID_SIZE * (GRID_EMPTY_PADDING / 2 + GRID_OBSTACLE_PADDING + 2)),
            2
        );

        W.symSquad(
            evaluate(GRID_SIZE * (GRID_EMPTY_PADDING / 2 + GRID_OBSTACLE_PADDING + 5)),
            evaluate(GRID_SIZE * (GRID_EMPTY_PADDING / 2 + GRID_OBSTACLE_PADDING + 2)),
            2
        );

        W.symSquad(
            evaluate(GRID_SIZE * (GRID_EMPTY_PADDING / 2 + GRID_OBSTACLE_PADDING + 8)),
            evaluate(GRID_SIZE * (GRID_EMPTY_PADDING / 2 + GRID_OBSTACLE_PADDING + 2)),
            2
        );

        for (let i = 0 ; i < rows * cols * 0.004 ; i++) {
            W.spawnBeacon();
        }

        const endCheck = {
            'cycle': () => {
                const playerUnits = W.units.filter(unit => unit.team == PLAYER_TEAM).length;
                const enemyUnits = W.units.filter(unit => unit.team == ENEMY_TEAM).length;
                const playerBeacons = W.beacons.filter(beacon => beacon.team == PLAYER_TEAM).length;
                const enemyBeacons = W.beacons.filter(beacon => beacon.team == ENEMY_TEAM).length;

                // End if someone captured all beacons OR if the player is completely dead
                if (!playerUnits || max(enemyBeacons, playerBeacons) == W.beacons.length || !enemyBeacons && !enemyUnits) {
                    W.remove(endCheck);
                    this.gameOver(!enemyBeacons);
                }
            }
        };
        W.add(endCheck, CYCLABLE);

        W.pauseAndAnnounce([
            nomangle('sector #') + G.levelId,
            nomangle('capture all the beacons to win')
        ]);
    }

    togglePause() {
        W.paused = !W.paused;
    }

    pauseAndAnnounce(s, callback) {
        const cyclables = W.cyclables.slice(0);
        W.cyclables = [];
        W.add(new Announcement(s, () => {
            W.cyclables = cyclables;
            if (callback) {
                callback();
            }
        }), RENDERABLE);
    }

    // Spawns squads for each team at opposite sides of the map
    symSquad(x, y, size) {
        W.squad(x, y, PLAYER_TEAM, size);
        W.squad(W.width - x, W.height - y, ENEMY_TEAM, size);
    }

    renderMinimap() {
        wrap(() => {
            translate(CANVAS_WIDTH - W.width * MINIMAP_SCALE - MINIMAP_MARGIN, CANVAS_HEIGHT - W.height * MINIMAP_SCALE - MINIMAP_MARGIN);

            R.globalAlpha = 0.5;
            R.strokeStyle = '#fff';
            R.lineWidth = 2;

            R.fillStyle = '#000';
            fr(4, 4, ~~(W.width * MINIMAP_SCALE), ~~(W.height * MINIMAP_SCALE));

            R.fillStyle = '#444';
            fr(0, 0, ~~(W.width * MINIMAP_SCALE), ~~(W.height * MINIMAP_SCALE));

            R.fillStyle = '#6cf';
            R.globalAlpha = 1;
            W.matrix.forEach((r, row) => {
                r.forEach((x, col) => {
                    if (x) {
                        fr(
                            round(col * GRID_SIZE * MINIMAP_SCALE),
                            round(row * GRID_SIZE * MINIMAP_SCALE),
                            round(MINIMAP_SCALE * GRID_SIZE),
                            round(MINIMAP_SCALE * GRID_SIZE)
                        );
                    }
                });
            });

            R.lineWidth = 1;
            R.fillStyle = '#fff';
            R.strokeStyle = '#000';
            R.globalAlpha = 0.2;
            fr(
                ~~(V.x * MINIMAP_SCALE),
                ~~(V.y * MINIMAP_SCALE),
                ~~(CANVAS_WIDTH * MINIMAP_SCALE),
                ~~(CANVAS_HEIGHT * MINIMAP_SCALE)
            );

            R.globalAlpha = 1;
            strokeRect(
                ~~(V.x * MINIMAP_SCALE) + 0.5,
                ~~(V.y * MINIMAP_SCALE) + 0.5,
                ~~(CANVAS_WIDTH * MINIMAP_SCALE),
                ~~(CANVAS_HEIGHT * MINIMAP_SCALE)
            );

            R.globalAlpha = 1;
            W.units
                .forEach(c => {
                    R.fillStyle = c.team.body;
                    fr(c.x * MINIMAP_SCALE - 2, c.y * MINIMAP_SCALE - 2, 4, 4);
                });

            W.beacons
                .forEach(beacon => {
                    R.fillStyle = beacon.team.beacon;
                    wrap(() => {
                        translate(beacon.x * MINIMAP_SCALE, beacon.y * MINIMAP_SCALE);
                        squareFocus(8, 4);
                    });
                });

            R.lineWidth = 1;
            R.strokeStyle = '#000';
            strokeRect(0.5, 0.5, ~~(W.width * MINIMAP_SCALE), ~~(W.height * MINIMAP_SCALE));
        });
    }

    renderHUD() {
        wrap(() => {
            translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT - HUD_HEIGHT);

            R.fillStyle = G.hudGradient;
            fr(-CANVAS_WIDTH / 2, 0, CANVAS_WIDTH, HUD_HEIGHT);

            R.fillStyle = G.hudBg;
            R.strokeStyle = '#000';
            beginPath();
            moveTo(-220, HUD_HEIGHT);
            lineTo(-170, 0.5);
            lineTo(170, 0.5);
            lineTo(220, HUD_HEIGHT);
            fill();
            stroke();

            drawCenteredText(nomangle('beacons'), 0, 20, HUD_SCORE_CELL_SIZE, '#fff', true);
            drawCenteredText(nomangle('units'), 0, 40, HUD_SCORE_CELL_SIZE, '#fff', true);

            function gauge(x, y, value, width, sign, color) {
                const w = (5 + width) * sign;

                R.fillStyle = '#000';
                fr(x + 2, y + 2, w, HUD_SCORE_CELL_SIZE * 5);

                R.fillStyle = color;
                fr(x, y, w, HUD_SCORE_CELL_SIZE * 5);

                drawCenteredText('' + value, x + w + sign * 15, y, HUD_SCORE_CELL_SIZE, color, true);
            }

            gauge(-HUD_GAUGE_GAP / 2, 20, G.beaconsScore(PLAYER_TEAM), G.beaconsScore(PLAYER_TEAM) / W.beacons.length * 100, -1, '#0f0');
            gauge(HUD_GAUGE_GAP / 2, 20, G.beaconsScore(ENEMY_TEAM), G.beaconsScore(ENEMY_TEAM) / W.beacons.length * 100, 1, '#f00');

            const playerUnits = G.unitsScore(PLAYER_TEAM);
            const enemyUnits = G.unitsScore(ENEMY_TEAM);
            const maxUnits = max(playerUnits, enemyUnits);

            gauge(-HUD_GAUGE_GAP / 2, 40, G.unitsScore(PLAYER_TEAM), G.unitsScore(PLAYER_TEAM) / maxUnits * 100, -1, '#0f0');
            gauge(HUD_GAUGE_GAP / 2, 40, G.unitsScore(ENEMY_TEAM), G.unitsScore(ENEMY_TEAM) / maxUnits * 100, 1, '#f00');
        });

        drawCenteredText(nomangle('wasd/arrows: move the camera  -  left click: select units  -  right click: send units  -  p: pause the game'), CANVAS_WIDTH / 2, 10, 2, '#888');
    }

    gameOver(win) {
        if (win) {
            TimeData.saveTime(G.levelId, W.t);
        }

        // Ugly format, but it saves bytes
        W.add(new Announcement(
            win ?
                [nomangle('sector secured')] :
                [nomangle('sector lost'), nomangle('you secured ') + (G.levelId - 1) + nomangle(' sectors')],
            () => {
                W.animatePolygons(1, 0);
                interp(W, 'flashAlpha', 0, 1, 1, 0.5, 0, () => G.launch(win ? GameplayWorld : MenuWorld));
            }),
            RENDERABLE
        );
    }

}
