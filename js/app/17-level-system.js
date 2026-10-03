// ============================================================
        // LEVEL SYSTEM
        // ============================================================
        const EXP_PER_LEVEL = 100;

        function getExpToNextLevel(level) {
            return EXP_PER_LEVEL + (level - 1) * 20;
        }

        function addExp(amount) {
            const levelData = getLevelData();
            let { level, exp } = levelData;
            exp += amount;
            const expToNext = getExpToNextLevel(level);
            while (exp >= expToNext) {
                exp -= expToNext;
                level++;
                showToast('success', `🎉 Level Up!`, `Bạn đã đạt Level ${level}!`);
                addGem(level * 5, true);
            }
            saveLevelData({ level, exp });
            updateProfileUI();
            return { level, exp };
        }
