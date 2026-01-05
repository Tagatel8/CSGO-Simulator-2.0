// ======================================================
//  CLASSES DE BASE
// ======================================================

class Player {
    constructor(name, baseSkill) {
        this.name = name;
        this.baseSkill = baseSkill; // 0.0 - 1.0
        this.kills = 0;
        this.deaths = 0;
    }

    resetStats() {
        this.kills = 0;
        this.deaths = 0;
    }
}

class Team {
    constructor(name, players, side) {
        this.name = name;
        this.players = players; // array de Player
        this.side = side; // "CT" ou "T"
        this.score = 0;
    }

    resetScore() {
        this.score = 0;
        this.players.forEach(p => p.resetStats());
    }
}

// ======================================================
//  INITIALISATION DES MENUS D'ÉQUIPES
// ======================================================

function populateTeamSelectors() {
    const selectA = document.getElementById("teamASelect");
    const selectB = document.getElementById("teamBSelect");

    TEAMS.forEach((team, index) => {
        const optionA = document.createElement("option");
        optionA.value = index;
        optionA.textContent = team.name;

        const optionB = document.createElement("option");
        optionB.value = index;
        optionB.textContent = team.name;

        selectA.appendChild(optionA);
        selectB.appendChild(optionB);
    });

    selectA.selectedIndex = 0;
    selectB.selectedIndex = 1;
}

populateTeamSelectors();

// ======================================================
//  SIMULATION DU MATCH (MR12 + OVERTIME)
// ======================================================

function simulateMatchMR12(teamCT, teamT) {
    teamCT.resetScore();
    teamT.resetScore();

    const logs = [];
    let currentCT = teamCT;
    let currentT = teamT;

    // ============================
    //   TEMPS RÉGLEMENTAIRE (24 rounds max)
    // ============================

    for (let round = 1; round <= 24; round++) {

        // Switch side après 12 rounds
        if (round === 13) {
            const temp = currentCT;
            currentCT = currentT;
            currentT = temp;
        }

        const roundResult = simulateSingleRound(currentCT, currentT, round);
        logs.push(roundResult.logLine);

        // Victoire immédiate à 13
        if (teamCT.score === 13 || teamT.score === 13) {
            return { logs };
        }
    }

    // Si pas 12–12 → match terminé
    if (teamCT.score !== 12 || teamT.score !== 12) {
        return { logs };
    }

    // ============================
    //   OVERTIME
    // ============================

    let overtimeBlock = 1;
    let roundNumber = 24;

    while (true) {
        const targetScore = 12 + overtimeBlock * 3 + 1; // 16, 19, 22...

        logs.push(`<div class="round-header">🔥 OVERTIME ${overtimeBlock} – Premier à ${targetScore}</div>`);

        // 6 rounds par overtime (3 CT / 3 T)
        for (let i = 0; i < 6; i++) {
            roundNumber++;

            // Switch side au milieu de l'OT
            if (i === 3) {
                const temp = currentCT;
                currentCT = currentT;
                currentT = temp;
            }

            const roundResult = simulateSingleRound(currentCT, currentT, roundNumber);
            logs.push(roundResult.logLine);

            // Victoire si une équipe atteint le score cible
            if (teamCT.score >= targetScore || teamT.score >= targetScore) {
                return { logs };
            }
        }

        // Sinon → nouvel overtime
        overtimeBlock++;
    }
}

// ======================================================
//  SIMULATION D’UN ROUND
// ======================================================

function simulateSingleRound(teamCT, teamT, roundNumber) {
    const ctBase = teamCT.players.reduce((sum, p) => sum + p.baseSkill, 0);
    const tBase = teamT.players.reduce((sum, p) => sum + p.baseSkill, 0);

    const ctSideBonus = 1.05;
    const ctPower = ctBase * ctSideBonus * randomFactor(0.85, 1.15);
    const tPower = tBase * randomFactor(0.85, 1.15);

    const ctWinProbability = ctPower / (ctPower + tPower);
    const ctWins = Math.random() < ctWinProbability;

    if (ctWins) teamCT.score++;
    else teamT.score++;

    const eventLog = simulateKillsForRound(teamCT, teamT, ctWins);

    const winnerSide = ctWins ? "CT" : "T";
    const winnerTeam = ctWins ? teamCT : teamT;
    const loserTeam = ctWins ? teamT : teamCT;

    const logLine = formatRoundLog(roundNumber, winnerSide, winnerTeam, loserTeam, eventLog);

    return { ctWins, logLine };
}

function randomFactor(min, max) {
    return min + Math.random() * (max - min);
}

// ======================================================
//  KILLS
// ======================================================

function simulateKillsForRound(teamCT, teamT, ctWins) {
    const killEvents = [];
    const totalKills = 8 + Math.floor(Math.random() * 5);

    for (let i = 0; i < totalKills; i++) {
        const attackerTeam = Math.random() < 0.5 ? teamCT : teamT;
        const defenderTeam = attackerTeam === teamCT ? teamT : teamCT;

        const attacker = pickPlayerWeighted(attackerTeam.players);
        const victim = pickPlayerWeighted(defenderTeam.players);

        attacker.kills++;
        victim.deaths++;

        killEvents.push(`${attacker.name} tue ${victim.name}`);
    }

    const winnerTeam = ctWins ? teamCT : teamT;
    const loserTeam = ctWins ? teamT : teamCT;

    const finisher = pickPlayerWeighted(winnerTeam.players);
    const lastVictim = pickPlayerWeighted(loserTeam.players);

    finisher.kills++;
    lastVictim.deaths++;

    killEvents.push(`Dernier kill : ${finisher.name} achève ${lastVictim.name}`);

    return killEvents;
}

function pickPlayerWeighted(players) {
    const totalSkill = players.reduce((sum, p) => sum + p.baseSkill, 0);
    let r = Math.random() * totalSkill;

    for (const p of players) {
        if (r < p.baseSkill) return p;
        r -= p.baseSkill;
    }

    return players[players.length - 1];
}

// ======================================================
//  LOGS
// ======================================================

function formatRoundLog(roundNumber, winnerSide, winnerTeam, loserTeam, events) {
    const winnerClass = winnerSide === "CT" ? "winner-ct" : "winner-t";

    let log = `
        <div class="round-header">
            Round ${roundNumber} -
            <span class="${winnerClass}">${winnerTeam.name} (${winnerSide}) remporte le round</span>
        </div>
        <div>Score: ${winnerTeam.name} ${winnerTeam.score} - ${loserTeam.score} ${loserTeam.name}</div>
        <ul>
    `;

    events.forEach(e => {
        log += `<li>${e}</li>`;
    });

    log += "</ul>";

    return log;
}

// ======================================================
//  AFFICHAGE DES STATS
// ======================================================

function renderStats(teamA, teamB) {
    const container = document.getElementById("statsContainer");
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "stats-table";

    table.innerHTML = `
        <thead>
            <tr>
                <th>Équipe</th>
                <th>Joueur</th>
                <th>Kills</th>
                <th>Deaths</th>
                <th>K/D</th>
                <th>Rating</th>
            </tr>
        </thead>
        <tbody id="statsBody"></tbody>
    `;

    container.appendChild(table);

    const tbody = document.getElementById("statsBody");

    function addTeamStats(team) {
        team.players.forEach(player => {
            const kd = player.deaths === 0 ? player.kills : (player.kills / player.deaths).toFixed(2);
            const ratingBase = player.deaths === 0 ? player.kills : player.kills / player.deaths;
            const rating = (player.kills * 0.7 + ratingBase * 0.3).toFixed(2);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${team.name}</td>
                <td>${player.name}</td>
                <td>${player.kills}</td>
                <td>${player.deaths}</td>
                <td>${kd}</td>
                <td>${rating}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    addTeamStats(teamA);
    addTeamStats(teamB);
}

// ======================================================
//  BOUTON DE SIMULATION
// ======================================================

document.getElementById("simulateButton").addEventListener("click", () => {
    const roundLogDiv = document.getElementById("roundLog");
    const finalScoreDiv = document.getElementById("finalScore");

    roundLogDiv.innerHTML = "";
    finalScoreDiv.textContent = "";

    const teamAIndex = document.getElementById("teamASelect").value;
    const teamBIndex = document.getElementById("teamBSelect").value;

    const teamAData = TEAMS[teamAIndex];
    const teamBData = TEAMS[teamBIndex];

    const teamA = new Team(teamAData.name, teamAData.players.map(p => new Player(p.name, p.skill)), "CT");
    const teamB = new Team(teamBData.name, teamBData.players.map(p => new Player(p.name, p.skill)), "T");

    const result = simulateMatchMR12(teamA, teamB);

    result.logs.forEach(line => {
        roundLogDiv.innerHTML += line;
    });

    finalScoreDiv.textContent = `Score final : ${teamA.name} ${teamA.score} - ${teamB.score} ${teamB.name}`;

    renderStats(teamA, teamB);
});
