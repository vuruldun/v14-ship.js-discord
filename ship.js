// =====================================================
// komutlar/eglence/ship.js
// =====================================================

const {
  PermissionFlagsBits
} = require("discord.js");

const shipSystem =
  require("../../utils/shipSystem");

const emojis =
  require("../../utils/emojis");

// =====================================================
// SADECE SHIP KANALI
// YÖNETİCİLER HER KANALDA KULLANABİLİR
// =====================================================

const SHIP_CHANNEL_ID =
  "";

// =====================================================
// COOLDOWN
// =====================================================

const shipCooldowns =
  new Map();

const SHIP_COOLDOWN =
  3000;

// =====================================================
// EMOJİ
// =====================================================

function em(
  name,
  fallback = "❔"
) {

  return (
    emojis?.[name] ||
    fallback
  );
}

// =====================================================
// COOLDOWN KONTROL
// =====================================================

function checkCooldown(
  userId
) {

  const now =
    Date.now();

  const last =
    shipCooldowns.get(
      userId
    ) || 0;

  const kalan =
    SHIP_COOLDOWN -
    (now - last);

  if (kalan > 0) {
    return kalan;
  }

  shipCooldowns.set(
    userId,
    now
  );

  return 0;
}

// =====================================================
// ESKİ COOLDOWN TEMİZLEME
// =====================================================

setInterval(
  () => {

    const now =
      Date.now();

    for (
      const [
        userId,
        time
      ]
      of shipCooldowns
    ) {

      if (
        now - time >
        SHIP_COOLDOWN * 10
      ) {

        shipCooldowns.delete(
          userId
        );
      }
    }

  },
  60000
).unref();

// =====================================================
// KOMUT
// =====================================================

exports.run = async (
  client,
  message,
  args
) => {

  try {

    // ===================================================
    // SUNUCU
    // ===================================================

    if (
      !message.guild
    ) {

      return message.reply({

        content:
          `${em(
            "red",
            "❌"
          )} Bu komut sadece sunucularda kullanılabilir.`,

        allowedMentions: {
          repliedUser:
            false
        }

      });
    }

    // ===================================================
    // YÖNETİCİ
    // ===================================================

    const yonetici =
      Boolean(
        message.member?.permissions?.has(
          PermissionFlagsBits.Administrator
        )
      );

    if (
      !yonetici &&
      message.channel.id !==
        SHIP_CHANNEL_ID
    ) {

      return message.reply({

        content:
          `${em(
            "red",
            "❌"
          )} Bu komutu sadece <#${SHIP_CHANNEL_ID}> kanalında kullanabilirsin.`,

        allowedMentions: {
          repliedUser:
            false
        }

      });
    }

    // ===================================================
    // COOLDOWN
    // ===================================================

    const kalan =
      checkCooldown(
        message.author.id
      );

    if (
      kalan > 0
    ) {

      return message.reply({

        content:
          `${em(
            "timeout",
            "⏳"
          )} Ship komutunu tekrar kullanmak için **${(
            kalan / 1000
          ).toFixed(1)} saniye** bekle.`,

        allowedMentions: {
          repliedUser:
            false
        }

      });
    }

    // ===================================================
    // KULLANAN KİŞİ
    // ===================================================

    const user1 =
      message.member;

    if (!user1) {

      return message.reply({

        content:
          `${em(
            "red",
            "❌"
          )} Kullanıcı bilgilerin alınamadı.`,

        allowedMentions: {
          repliedUser:
            false
        }

      });
    }

    // ===================================================
    // ETİKETLENEN KİŞİ
    // ===================================================

    let user2 =
      null;

    if (
      message.mentions.members.size >
      0
    ) {

      user2 =
        message.mentions.members.first();

      if (!user2) {

        return message.reply({

          content:
            `${em(
              "red",
              "❌"
            )} Kullanıcı bulunamadı.`,

          allowedMentions: {
            repliedUser:
              false
          }

        });
      }

      if (
        user2.id ===
        user1.id
      ) {

        return message.reply({

          content:
            `${em(
              "block",
              "🚫"
            )} Kendinle shiplenemezsin.`,

          allowedMentions: {
            repliedUser:
              false
          }

        });
      }

      if (
        user2.user.bot ||
        user2.user.system
      ) {

        return message.reply({

          content:
            `${em(
              "red",
              "❌"
            )} Botlarla ship yapılamaz.`,

          allowedMentions: {
            repliedUser:
              false
          }

        });
      }

    }

    // ===================================================
    // RASTGELE ÜYE
    // ===================================================

    else {

      /*
       * ÖNEMLİ:
       *
       * Artık:
       * await guild.members.fetch();
       *
       * YOK.
       *
       *
       */

      const members =
        message.guild.members.cache.filter(
          member =>

            !member.user.bot &&

            !member.user.system &&

            member.id !==
              user1.id
        );

      if (
        members.size ===
        0
      ) {

        return message.reply({

          content:
            `${em(
              "red",
              "❌"
            )} Ship yapmak için başka bir gerçek üye bulunamadı.`,

          allowedMentions: {
            repliedUser:
              false
          }

        });
      }

      const liste =
        [
          ...members.values()
        ];

      user2 =
        liste[
          Math.floor(
            Math.random() *
              liste.length
          )
        ];
    }

    // ===================================================
    // SON KONTROLLER
    // ===================================================

    if (
      !user1 ||
      !user2
    ) {

      return message.reply({

        content:
          `${em(
            "red",
            "❌"
          )} Ship için kullanıcı bulunamadı.`,

        allowedMentions: {
          repliedUser:
            false
        }

      });
    }

    if (
      user1.id ===
      user2.id
    ) {

      return message.reply({

        content:
          `${em(
            "block",
            "🚫"
          )} Aynı kişi kendisiyle shiplenemez.`,

        allowedMentions: {
          repliedUser:
            false
        }

      });
    }

    // ===================================================
    // SHIP GÖRSELİ
    // ===================================================

    const sonuc =
      await shipSystem.createShipImage({

        client,

        guild:
          message.guild,

        user1,

        user2
      });

    if (
      !sonuc ||
      !sonuc.file
    ) {

      return message.reply({

        content:
          `${em(
            "red",
            "❌"
          )} Ship görseli oluşturulamadı.`,

        allowedMentions: {
          repliedUser:
            false
        }

      });
    }

    // ===================================================
    // GÖNDER
    // ===================================================

    return message.reply({

      files: [
        sonuc.file
      ],

      components:
        sonuc.components ||
        [],

      allowedMentions: {
        repliedUser:
          false
      }

    });

  } catch (err) {

    console.log(
      "[SHIP ERROR]",
      err
    );

    return message.reply({

      content:
        `${em(
          "red",
          "❌"
        )} Ship oluşturulurken bir hata oluştu.`,

      allowedMentions: {
        repliedUser:
          false
      }

    }).catch(
      () => {}
    );
  }
};

// =====================================================
// KOMUT AYARLARI
// =====================================================

exports.conf = {

  aliases: [
    "ship",
    "shiple"
  ]
};

exports.help = {

  name:
    "ship"
};
