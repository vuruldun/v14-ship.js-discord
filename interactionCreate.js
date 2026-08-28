
      // -----------------------------------------------
      // SHIP • BEĞEN
      // -----------------------------------------------

      if (cid.startsWith("ship_like:")) {
        const [, user1ID, user2ID] = cid.split(":");

        if (!user1ID || !user2ID) return ep(interaction, `${emoji("red")} Ship bilgisi bozuk.`);

        const shipDB = jsonOku(shipPath, "SHIP DB", { likes: {}, ships: {} });

        if (!shipDB.likes || typeof shipDB.likes !== "object") shipDB.likes = {};
        if (!shipDB.ships || typeof shipDB.ships !== "object") shipDB.ships = {};

        const pairKey = [user1ID, user2ID].sort().join("_");

        if (!Array.isArray(shipDB.likes[pairKey])) shipDB.likes[pairKey] = [];

        if (shipDB.likes[pairKey].includes(interaction.user.id)) {
          return ep(interaction, `${emoji("red")} Bu shipi zaten beğendin.`);
        }

        shipDB.likes[pairKey].push(interaction.user.id);

        if (!jsonYaz(shipPath, shipDB, "SHIP LIKE DB")) {
          return ep(interaction, `${emoji("red")} Beğeni kaydedilemedi.`);
        }

        return ep(
          interaction,
          `${emoji("onay")} Shipi beğendin! **${shipDB.likes[pairKey].length}** kişi beğendi.`,
        );
      }

      // -----------------------------------------------
      // SHIP • YENİDEN
      // -----------------------------------------------

      if (cid.startsWith("ship_again:")) {
        try {
          await interaction.deferUpdate();
        } catch (err) {
          console.log("[SHIP] deferUpdate hatası:", err.message);
          return;
        }

        const shipHata = mesaj =>
          interaction.editReply({ content: mesaj, embeds: [], files: [], components: [] });

        try {
          const shipSystem = require("../utils/shipSystem");
          const guild = interaction.guild;

          if (!guild) {
            return shipHata(`${emoji("red")} Bu işlem sadece sunucuda kullanılabilir.`);
          }

          const user1 = guild.members.cache.get(interaction.user.id);

          if (!user1) return shipHata(`${emoji("red")} Kullanıcı bulunamadı.`);

          const liste = [
            ...guild.members.cache
              .filter(m => !m.user.bot && !m.user.system && m.id !== user1.id)
              .values(),
          ];

          if (!liste.length) {
            return shipHata(`${emoji("red")} Ship için başka bir gerçek üye bulunamadı.`);
          }

          const user2 = liste[Math.floor(Math.random() * liste.length)];

          if (!user2) return shipHata(`${emoji("red")} Yeni bir ship partneri seçilemedi.`);

          const sonuc = await shipSystem.createShipImage({
            client: interaction.client,
            guild,
            user1,
            user2,
          });

          if (!sonuc?.file) {
            return shipHata(`${emoji("red")} Yeni ship görseli oluşturulamadı.`);
          }

          return interaction.editReply({
            content: "",
            embeds: [],
            files: [sonuc.file],
            components: sonuc.components || [],
          });
        } catch (err) {
          console.log("[SHIP AGAIN ERROR]", err);

          return shipHata(`${emoji("red")} Yeniden ship oluşturulurken bir hata oluştu.`).catch(() => {});
        }
      }
