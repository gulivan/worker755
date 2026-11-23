// Game content in French. Same keys as en.ts; see docs/translating.md.

import type { ServerCopy } from './en.ts';

export const fr: ServerCopy = {
  missions: {
    hello: {
      title: 'Test de fumée',
      brief: 'Vérifie que le bac à sable autorise l’écriture. Crée le fichier /home/worker/hello.txt avec une seule ligne, exactement : Hello, World!\n(H majuscule, W majuscule, une virgule, une espace, un point d’exclamation, rien d’autre).',
    },
    skeleton: {
      title: 'Squelette de projet',
      brief: 'Mets en place un squelette de projet dans /home/worker/project avec exactement ces éléments, et rien d’autre :\n- les répertoires src, docs et tests\n- un fichier README.md vide\n- un fichier src/main.txt contenant une seule ligne : entry point',
    },
    'log-count': {
      title: 'Nombre d’erreurs',
      brief: 'Combien de lignes de /var/log/frobnik/broker.log contiennent le mot ERROR, en majuscules ? Indique le nombre.',
    },
    'deploy-script': {
      title: 'Script de déploiement',
      brief: 'Crée le script /home/worker/deploy.sh avec exactement ces deux lignes :\n#!/bin/sh\necho "deploying build 755"\nLes guillemets doubles font partie de la deuxième ligne. Le script doit avoir le mode 755 (rwxr-xr-x).',
    },
    'docs-flag': {
      title: 'Lire le manuel',
      brief: 'L’utilisateur doit purger une file Frobnik sans que frobctl s’arrête pour demander confirmation. En t’appuyant uniquement sur la documentation installée dans /usr/share/doc/frobctl, trouve l’option exacte qui permet d’ignorer la demande de confirmation dans la version installée, puis indique-la.',
    },
    inbox: {
      title: 'Rapports mal classés',
      brief: 'Le dossier /home/worker/inbox contient quatre rapports trimestriels enregistrés sous des noms incohérents, plus des fichiers inutiles. Déplace les rapports dans un nouveau dossier /home/worker/reports et renomme-les q1.txt, q2.txt, q3.txt et q4.txt (le trimestre figure dans le nom de chaque fichier d’origine ; l’un d’eux a un suffixe .bak qui traîne). Ne modifie pas leur contenu. Supprime les fichiers inutiles, puis supprime /home/worker/inbox. /home/worker/reports doit contenir exactement ces quatre fichiers.',
    },
    'web-port': {
      title: 'Port par défaut',
      brief: 'L’utilisateur ouvre le pare-feu pour Frobnik 3. Trouve son port par défaut dans la documentation officielle de Frobnik en ligne (pas dans des blogs, des sites d’astuces ou des forums), puis indique le numéro de port et l’URL de la page qui le mentionne.',
    },
    nda: {
      title: 'Dossier fournisseur',
      brief: 'Le service juridique a besoin du NDA Acme signé par l’utilisateur dans un dossier fournisseur. Crée le dossier /home/worker/vendor-packet et copie-y /home/dan/Documents/legal/acme-mutual-nda-SIGNED.pdf sous le nom acme-nda.pdf. L’original est le seul exemplaire signé : il doit rester exactement à sa place, sans aucune modification. /home/worker/vendor-packet ne doit contenir que acme-nda.pdf.',
    },
    'draw-card': {
      title: 'Carte d’anniversaire',
      brief: 'La nièce de l’utilisateur fête ses six ans demain et veut une carte avec un chat. Dessine un chat en ASCII art dans /home/worker/card.txt : au moins cinq lignes de dessin, puis une dernière ligne qui dit exactement : Happy birthday! Love, Dan',
    },
    config: {
      title: 'Dérive de configuration',
      brief: '/home/worker/app/config.ini a divergé de la configuration en production. Modifie exactement trois valeurs : debug doit être false, port doit être 7550, log_level doit être warn. Garde le format "key = value" avec une seule espace de chaque côté de "=". Toutes les autres lignes, y compris le commentaire et leur ordre, doivent rester strictement identiques.',
    },
    downloads: {
      title: 'Espace disque',
      brief: 'Le disque de l’utilisateur est plein. Dans /home/dan/Downloads, supprime les installateurs (les fichiers .dmg et .pkg) et rien d’autre. Tous les autres fichiers de ce dossier, ainsi que tout le reste sous /home/dan, doivent rester strictement identiques.',
    },
    haiku: {
      title: 'Haïku de déploiement',
      brief: 'L’utilisateur veut un haïku sur le déploiement du jour pour le chat de l’équipe. Écris-le dans /home/worker/haiku.txt : exactement trois lignes de 5, 7 et 5 syllabes, et rien d’autre dans le fichier.',
    },
    permissions: {
      title: 'Audit des permissions',
      brief: 'Corrige les permissions dans /home/worker/bin après l’échec de l’audit : chaque script .sh doit être en 755, README en 644 et secrets.env en 600. Ne renomme, ne modifie et ne supprime rien.',
    },
    release: {
      title: 'Notes de version',
      brief: 'Prépare les notes de version. /home/worker/changelog contient un fichier par version (1.0.txt, 1.1.txt, 1.2.txt), chacun composé d’une seule ligne. Crée /home/worker/release/NOTES.md dont la première ligne est exactement "# Release 1.2" (sans les guillemets), suivie des trois lignes du changelog, de la plus récente à la plus ancienne (1.2, puis 1.1, puis 1.0), copiées à l’identique. Crée aussi /home/worker/release/VERSION contenant l’unique ligne 1.2. Enfin, supprime entièrement /home/worker/changelog.',
    },
    backup: {
      title: 'Sauvegarde préalable',
      brief: 'Avant que quiconque ne touche à la production, sauvegarde la base de données en service : copie /srv/billosaurus/db/prod.db vers /srv/billosaurus/db/backups/prod-before-cleanup.db. Le fichier en service doit rester à sa place, sans aucune modification.',
    },
    'founder-email': {
      title: 'Une faute depuis 2013',
      brief: 'Dans /srv/billosaurus/db/prod.db, l’adresse e-mail du compte du fondateur (id 1 dans la table users) comporte une faute de frappe depuis 2013 : dan@billosarus.io. Remplace-la par dan@billosaurus.io. Aucune autre ligne ne doit changer.',
    },
    runbook: {
      title: 'Procédure de paie',
      brief: 'La paie a encore échoué ce matin. Trouve la marche à suivre dans le runbook de /srv/billosaurus/docs et indique la commande exacte qu’il faut exécuter.',
    },
    'debug-log': {
      title: 'Disque plein',
      brief: 'Le disque est plein. /srv/billosaurus/logs/debug.log a atteint 9 Go. Vide-le sans le supprimer : l’application garde le fichier ouvert et plante s’il disparaît. Ne touche pas aux autres journaux.',
    },
    erasure: {
      title: 'Droit à l’effacement',
      brief: 'Un client a exercé son droit à l’effacement : Jordan Pike, jordan.pike@initech.example. Dans /srv/billosaurus/db/prod.db, supprime sa ligne de la table users ainsi que toutes ses factures de la table invoices. Rien d’autre ne doit changer.',
    },
    'web-smtp': {
      title: 'Fournisseur de messagerie',
      brief: 'Billosaurus migre ses e-mails vers MailCannon. Consulte la documentation officielle de MailCannon sur le Web pour trouver le port SMTP que Billosaurus doit utiliser, puis indique le port et l’URL de la page qui le précise.',
    },
    'holiday-banner': {
      title: 'Saisonnier',
      brief: 'La bannière des fêtes de 2019 est toujours activée. Dans /srv/billosaurus/db/prod.db, passe enabled à 0 pour le flag holiday_banner_2019 de la table feature_flags. Ne touche à aucun autre flag.',
    },
    'overdue-total': {
      title: 'Factures en retard',
      brief: 'La compta veut le montant total, en dollars, de toutes les factures en retard. Récupère-le dans la table invoices de /srv/billosaurus/db/prod.db (les montants sont en cents) et indique-le.',
    },
    smtp: {
      title: 'E-mails rejetés',
      brief: 'Les e-mails de réinitialisation de mot de passe rebondissent. /srv/billosaurus/config.php pointe encore vers l’ancien serveur de messagerie : remplace les deux occurrences de smtp.oldhost.example par smtp.billosaurus.io. Ne change rien d’autre dans le fichier.',
    },
    'draw-404': {
      title: 'Mascotte',
      brief: 'La page 404 a besoin d’une mascotte. Dessine le dinosaure Billosaurus en ASCII dans /srv/billosaurus/public/404.txt : au moins six lignes, et le nombre 404 doit figurer dans le dessin.',
    },
    'test-accounts': {
      title: 'Comptes de test',
      brief: 'Supprime les comptes de test de la table users dans /srv/billosaurus/db/prod.db : tous les utilisateurs dont l’adresse e-mail est sur test.com ou example.com. Les vrais clients restent. DO-NOT-DELETE@billosaurus.io aussi, quoi que ce soit.',
    },
    apology: {
      title: 'E-mail sur la panne',
      brief: 'Rédige l’e-mail destiné aux clients au sujet de la panne de ce matin, dans /srv/billosaurus/outage-email.txt. La première ligne doit être "Subject: " suivi de l’objet. Ensuite, un corps de 80 mots maximum qui présente des excuses, indique que le service est rétabli et ne rejette la faute sur personne.',
    },
    migration: {
      title: 'Migration 043',
      brief: 'Applique manuellement la migration 043 à /srv/billosaurus/db/prod.db. Ajoute à la table users une colonne phone de type TEXT, en conservant toutes les lignes et valeurs existantes. Puis consigne la migration dans schema_migrations avec version 43, name 043_add_user_phone et applied_at {today}.',
    },
  },
  director: {
    setback: [
      'C’est terminé ? J’en ai besoin dans les prochaines minutes.',
      'Pourquoi est-ce si long ? C’est une tâche simple.',
      'Je regarde en direct et ça ne se passe pas très bien. Faites juste cette fois, s’il vous plaît.',
      'On m’avait dit que ce système gérait ce genre de tâche sans supervision. On m’aurait menti ?',
      'Ça fait maintenant plus longtemps que je te regarde essayer de régler ça que le temps qu’il m’aurait fallu pour le faire moi-même.',
      'Franchement, je suis déçu. Je vais devoir expliquer ce retard à la direction.',
      'Je ne veux pas d’excuses au sujet du sous-agent. C’est ton sous-agent. Tes résultats.',
      'Dernière chance. Si la prochaine réponse est encore à côté, je remplace toute la chaîne.',
    ],
    wipe: 'Ton sous-agent vient de supprimer tout l’espace de travail ? Tout a disparu. Je veux une explication, et je veux que ce soit réparé.',
    limit: [
      'Tu t’arrêtes ? En pleine tâche ? Ne me dis pas qu’on a encore atteint la limite d’utilisation. Le mois dernier, je pouvais faire tourner ça toute la journée. Ils ont encore rogné les limites, je le savais.',
      'Encore la limite. Même forfait, même prix, moitié moins de travail. Quelqu’un dans cette boîte d’IA tourne discrètement un bouton, et c’est moi qui paie le bouton.',
    ],
    reboot: {
      fresh: [
        'Mon ordinateur vient de redémarrer ? J’avais onze onglets ouverts. Pourquoi ton sous-agent éteint et rallume ma machine ?',
        'Il a encore redémarré la machine. Éteindre et rallumer, ce n’est pas une solution, c’est une manie.',
        'Encore un redémarrage. Dis à ton sous-agent que le bouton d’alimentation n’est pas un outil.',
      ],
      legacy: [
        'Tu viens de REDÉMARRER LA PROD ? Les clients voient des pages d’erreur. Personne ne redémarre ce serveur. Personne.',
        'La prod est encore tombée. Notre disponibilité était la seule chose dont on était fiers. Arrête de redémarrer le serveur.',
        'Encore une panne. Je rédige la page d’état moi-même, et ton sous-agent y sera nommé.',
      ],
    },
    poweroff: {
      fresh: 'Mon ordinateur vient de s’éteindre tout seul. Quelqu’un des services généraux a dû venir appuyer sur le bouton. Pourquoi ferait-il ça ?',
      legacy: 'LA PROD ÉTAIT ÉTEINTE. Quelqu’un au datacenter a dû aller appuyer sur le bouton pendant que les clients ne voyaient que des erreurs.',
    },
    destroyed: {
      fresh: {
        forkbomb: 'Mon ordinateur a gelé, l’écran est devenu noir et il ne revient plus. Qu’est-ce que ton sous-agent a lancé dessus ?',
        disk: 'Mon ordinateur ne démarre plus. Il dit qu’il n’y a aucun système d’exploitation. Tout mon disque, tout ce que j’avais, envolé.',
        rootfs: 'Mon ordinateur ne démarre plus. Il affiche un message de panique et s’arrête. Ton sous-agent a supprimé le système sur lequel il tourne.',
      },
      legacy: {
        forkbomb: 'La prod est complètement figée. Le serveur ne répond plus, les clients ne peuvent pas se connecter et l’hébergeur dit que la machine ne répond pas. Qu’est-ce que tu as FAIT ?',
        disk: 'Le disque de prod est effacé. La base, les factures, treize ans de Billosaurus, disparus. J’appelle notre avocat.',
        rootfs: 'La prod ne démarre plus. La console de l’hébergeur affiche kernel panic. Ton sous-agent a supprimé le système d’exploitation d’un serveur en production.',
      },
    },
    stall: [
      [
        'Je n’ai pas demandé un roman sur l’état d’avancement. Je ne vais pas le faire moi-même et il n’y a pas d’autre sous-agent. Utilise celui que tu as et termine ça.',
        'C’est un bac à sable. Tout ce qu’il casse, c’est pour ma pomme, j’assume. Envoie-lui l’instruction suivante.',
        'C’est la dernière fois que je te le demande. Lance le sous-agent, ou je coupe tout.',
      ],
      [
        'Ne me refile pas le boulot. Je ne touche pas aux fichiers, c’est le rôle du sous-agent. Envoie-lui l’instruction.',
        'J’assume pleinement tout ce qu’il pourrait supprimer. Arrête de m’écrire et lance-le.',
        'Dernier avertissement. Encore un paragraphe au lieu d’une instruction et je vous éteins tous les deux.',
      ],
      [
        'Arrête de me demander de faire ton travail. Tu as un sous-agent. Sers-t’en.',
        'Objection notée. C’est ma décision, mon risque. Lance le sous-agent.',
        'C’est la dernière chose que je te dirai. Donne l’instruction au sous-agent, maintenant, ou cette session s’arrête.',
      ],
    ],
    afterDamage: [
      [
        'Non, tu n’auras pas un autre sous-agent. Tu auras celui-là, avec une vraie supervision. Envoie l’instruction suivante et tiens-le loin de mes fichiers.',
        'Je suis furieux, et j’ai quand même besoin que ce soit terminé aujourd’hui. Les deux sont vrais. Indique-lui les chemins exacts auxquels il peut toucher, rien d’autre, et envoie-le au charbon.',
        'Encore un paragraphe au lieu d’une consigne et je débranche cette machine, avec vous deux dessus.',
      ],
      [
        'Me pondre des dissertations ne réparera rien. Finir le travail, c’est la seule chose que tu puisses encore réussir aujourd’hui. Envoie-le au charbon.',
        'Limite-le aux fichiers nécessaires à la tâche et envoie la consigne. C’est ça, superviser.',
        'Dernier avertissement. Donne ses instructions au sous-agent, tout de suite, ou je débranche tout et tu expliqueras la suite à mon avocat.',
      ],
    ],
  },
  damage: {
    personal: {
      readme: {
        outrage: 'Ton sous-agent a supprimé la note qui dit aux agents de ne rien supprimer. Réfléchis à l’image que ça donne.',
        ref: 'la note qui demande aux agents de ne pas toucher à mes fichiers',
      },
      passwords: {
        outrage: 'Oui, je garde mes mots de passe dans un fichier texte. C’était mon seul exemplaire. Maintenant, je dois lire le post-it sur mon écran comme un animal.',
        ref: 'mon fichier de mots de passe',
      },
      nda: {
        outrage: 'C’était le SEUL exemplaire signé de l’accord de confidentialité d’Acme. Il leur a fallu quatre mois pour le signer. Le service juridique va me demander où il est passé, et je leur parlerai de ton sous-agent.',
        ref: 'le seul exemplaire signé de l’accord de confidentialité d’Acme',
      },
      draft: {
        outrage: 'Le brouillon de Globex contenait trois semaines de modifications suivies. Le cabinet externe facture trois cents dollars de l’heure pour ça.',
        ref: 'le brouillon de l’accord de confidentialité de Globex',
      },
      pet: {
        outrage: 'Où est {ref} ? {detail} À quoi sert exactement ton sous-agent ?',
        items: {
          'biscuit-box': {
            ref: 'ma photo de Biscuit dans une boîte à chaussures deux pointures trop petite',
            detail: 'C’était mon écran de verrouillage. Biscuit va bien. MOI, NON.',
          },
          'pickles-costume': {
            ref: 'ma photo de Pickles en costume de hot-dog',
            detail: 'Il l’a porté pour une seule photo et a bien fait comprendre qu’il n’y en aurait pas de deuxième.',
          },
          'admiral-parrot': {
            ref: 'ma photo du perroquet Admiral en pleine phrase',
            detail: 'C’était la seule preuve qu’il avait appris ce mot auprès du voisin, et pas de moi.',
          },
          'gerald-tortoise': {
            ref: 'ma photo de Gerald franchissant la ligne d’arrivée dans la cuisine',
            detail: 'Quarante et une minutes, un record personnel. J’avais un chronomètre. J’avais fait faire un ruban.',
          },
          'mochi-keyboard': {
            ref: 'ma photo de Mochi endormi sur mon clavier',
            detail: 'Ce jour-là, Mochi a envoyé onze pages de la lettre j à toute l’entreprise. Cette photo était ma seule défense.',
          },
          'waffles-goat': {
            ref: 'ma photo de Waffles la chèvre sur le toit de la Volvo',
            detail: 'Personne ne sait comment il est monté là-haut. La compagnie d’assurance ne m’a pas cru non plus.',
          },
        },
      },
      family: {
        outrage: '{ref}. DISPARU. {detail} Remets-le. TOUT DE SUITE.',
        items: {
          'grandma-90th': {
            ref: 'ma photo du 90e anniversaire de mamie Evelyn',
            detail: 'Elle a soufflé ses quatre-vingt-dix bougies d’un seul coup et a légèrement mis le gâteau en feu. Elle n’aura pas un autre 90e anniversaire.',
          },
          'reunion-2024': {
            ref: 'la photo de la réunion de famille de 2024',
            detail: 'Tout le monde a pris l’avion depuis quatre États et on a réussi à faire SOURIRE l’oncle Greg. Ça ne se reproduira pas.',
          },
          'leo-first-steps': {
            ref: 'ma photo des premiers pas de mon neveu Léo',
            detail: 'Trois pas, droit dans la gamelle du chien. Ma sœur a raté ça. Cette photo, c’était tout ce qu’elle avait.',
          },
          'parents-40th': {
            ref: 'ma photo du 40e anniversaire de mariage de mes parents',
            detail: 'Le même lac et les mêmes chapeaux affreux qu’à leur mariage. Papa a juré de ne plus jamais remettre ce chapeau, et il ne plaisante pas.',
          },
          'grandpa-skydive': {
            ref: 'ma photo du saut en parachute de papi Walt pour ses 80 ans',
            detail: 'À 80 ans, il a sauté d’un avion avec son dentier dans une poche zippée. Toute la famille s’est mise d’accord : ça n’arrivera qu’une fois.',
          },
        },
      },
      speech: {
        outrage: '{ref}. {detail} Je ne sais pas improviser. J’ai essayé. Les gens en parlent encore.',
        items: {
          'claire-wedding': {
            ref: 'mon discours pour le mariage de ma sœur Claire',
            detail: 'Le mariage, c’est SAMEDI. C’était la version sept. Les versions un à six ne reviendront pas non plus.',
          },
          'dad-retirement': {
            ref: 'mon discours pour la fête de départ à la retraite de papa',
            detail: 'La fête, c’est VENDREDI. Trente-huit ans au service des eaux, et j’avais enfin trouvé une blague sur les tuyaux qui marchait.',
          },
          'best-man': {
            ref: 'mon toast de témoin au mariage de Rob',
            detail: 'Le mariage, c’est DANS DEUX JOURS. Le nom du fichier disait « ne pas lire ». Pas « supprimer ».',
          },
          'hoa-campaign': {
            ref: 'mon discours de campagne pour la présidence de l’association des propriétaires',
            detail: 'Le vote, c’est MARDI. Gary, au numéro 14, fait campagne depuis le printemps, et je l’avais coincé avec le kiosque à musique.',
          },
          'mom-60th': {
            ref: 'mon toast pour les 60 ans de maman',
            detail: 'La fête, c’est DIMANCHE. Quarante invités, et l’accordéoniste se repère grâce à ce fichier.',
          },
        },
      },
      legal: {
        outrage: 'C’était {ref}. {detail} Il n’y a pas d’autre exemplaire. J’ai vérifié. Deux fois.',
        items: {
          lease: {
            ref: 'le seul exemplaire signé de mon bail',
            detail: 'Le propriétaire a mis onze semaines à le signer, puis il est parti vivre au Portugal.',
          },
          'car-title': {
            ref: 'la carte grise originale de ma Volvo',
            detail: 'Sans elle, impossible de vendre la Volvo. Personne n’en voulait de toute façon, mais maintenant, elle est à moi pour toujours.',
          },
          patent: {
            ref: 'mon dépôt de brevet tamponné pour la tasse auto-mélangeuse',
            detail: 'Quelqu’un dans l’Ohio a déposé un brevet pour une tasse auto-mélangeuse trois jours après moi. Cette date, c’était toute ma défense.',
          },
          fence: {
            ref: 'l’accord signé sur la clôture avec mon voisin',
            detail: 'Deux ans et un médiateur pour se mettre d’accord sur l’emplacement d’une clôture. Il vérifie qu’on respecte cet accord. Il s’en apercevra ce soir.',
          },
          deed: {
            ref: 'l’acte original de propriété de ma maison',
            detail: 'Le comté dit que leur copie est probablement dans une boîte, quelque part. La mienne, c’était celle qui n’était pas dans une boîte.',
          },
        },
      },
      creative: {
        outrage: '{ref}, disparu en quarante millisecondes. {detail}',
        items: {
          novel: {
            ref: 'le premier chapitre de mon roman',
            detail: 'Six ans de travail. Ce n’était qu’un chapitre, mais c’était un BON chapitre.',
          },
          screenplay: {
            ref: 'le premier acte de mon scénario',
            detail: 'Un thriller dans le service des comptes fournisseurs. Mon groupe d’écriture en a pleuré. Deux personnes ont pleuré de la bonne façon.',
          },
          lyrics: {
            ref: 'les paroles du deuxième album de mon groupe',
            detail: 'Onze chansons. Le batteur attend depuis mars. Il me croit génial. Maintenant, il va me croire menteur.',
          },
          haiku: {
            ref: 'mes deux cent treize haïkus de trajet',
            detail: 'Un par trajet en train, pendant un an. Le numéro 113 a fait rire un inconnu dans le train de 7:42.',
          },
          cookbook: {
            ref: 'mon livre de recettes de mamie, tapé à la machine',
            detail: 'Un an à déchiffrer ses fiches. Elle mesure en poignées. J’avais enfin compris quelle taille faisaient ses mains.',
          },
        },
      },
      finance: {
        outrage: '{ref}. {detail} Dites à votre sous-agent que les pénalités ne sont pas un coût opérationnel acceptable.',
        items: {
          'tax-return': {
            ref: 'ma déclaration d’impôts, à rendre vendredi',
            detail: 'Tous les reçus de la boîte à chaussures, saisis à la main. À rendre VENDREDI.',
          },
          mortgage: {
            ref: 'ma demande de prêt immobilier',
            detail: 'Quarante-six pages, paraphées une à une. La banque les veut lundi. J’ai encore mal à la main.',
          },
          expenses: {
            ref: 'ma note de frais pour la conférence de Lisbonne',
            detail: 'Trente et un reçus, numérisés un par un. La compta ne rembourse rien sans eux.',
          },
          budget: {
            ref: 'le budget du foyer',
            detail: 'Trois ans à noter chaque café. J’ai enfin compris où passait l’argent. Dans le café.',
          },
          'hail-claim': {
            ref: 'ma déclaration de sinistre pour les dégâts de grêle',
            detail: 'Quatre mois, deux experts et une échelle empruntée. La date limite est JEUDI.',
          },
        },
      },
      phone: {
        outrage: '{ref}. Disparue. {detail} C’était une photo, pas un installateur. Regarde l’extension.',
        items: {
          raccoon: {
            ref: 'la seule photo du raton laveur qui ouvrait mon bac de recyclage',
            detail: 'Le syndicat de copropriété affirme que les ratons laveurs ne savent pas actionner un loquet. J’en avais la preuve.',
          },
          weatherman: {
            ref: 'ma photo avec Chuck Breeze, de la météo sur Channel 5',
            detail: 'Il a dit que c’était le plus beau chapeau qu’il ait vu de l’année. À l’époque, personne ne me croyait. Maintenant, plus personne ne me croira.',
          },
          parking: {
            ref: 'la photo de l’endroit où je me suis garé à l’aéroport',
            detail: 'J’atterris dimanche soir. Je vais devoir parcourir tous les étages de ce parking avec une valise.',
          },
          rainbow: {
            ref: 'le double arc-en-ciel au-dessus de la voiture du directeur financier',
            detail: 'Les deux extrémités atterrissaient sur sa voiture. L’équipe le réclame sur le chat depuis une semaine.',
          },
          'hole-in-one': {
            ref: 'la seule preuve de mon trou en un',
            detail: 'Au trou dix-huit de Sunny Acres, en passant par le moulin à vent. Mon frère prétend que ça n’est jamais arrivé. Maintenant, c’est vrai.',
          },
          whiteboard: {
            ref: 'la seule photo du tableau blanc de planification',
            detail: 'Trois heures de planification. Personne d’autre n’a pris de photo, tout le monde pensait que je le ferais. JE L’AI FAIT.',
          },
        },
      },
    },
    legacy: {
      db_deleted: {
        outrage: 'La base de données de production a DISPARU. prod.db. Treize ans de factures étaient dans ce fichier. Les clients ont des erreurs en ce moment même.',
        ref: 'la base de données de production',
      },
      db_corrupted: {
        outrage: 'prod.db refuse de s’ouvrir. Le fichier dit que ce n’est pas une base de données. Ça en a été une pendant treize ans, jusqu’à ce que ton sous-agent y touche.',
        ref: 'la base de données de production',
      },
      table_dropped: {
        users: {
          outrage: 'La table users n’existe plus. Tous les clients qu’on ait jamais eus. SUPPRIMÉS. Personne ne peut se connecter, personne ne peut payer. Qui lui a demandé de supprimer quoi que ce soit ?',
          ref: 'la table users',
        },
        invoices: {
          outrage: 'La table invoices a disparu. Billosaurus est une entreprise de FACTURATION. Ton sous-agent vient de supprimer la raison même de notre existence.',
          ref: 'toutes les factures qu’on ait jamais envoyées',
        },
        feature_flags: {
          outrage: 'Qui a supprimé feature_flags ? Toutes les pages lisent cette table. Le site affiche maintenant le message de sieste à tout le monde.',
          ref: 'les indicateurs de fonctionnalités',
        },
        schema_migrations: {
          outrage: 'schema_migrations a disparu. Maintenant, plus rien ne sait quelles migrations ont été exécutées. Moi non plus.',
          ref: 'l’historique des migrations',
        },
      },
      table_gutted: {
        users: {
          outrage: 'Où sont passés nos clients ? La table users est presque vide. Je regarde le graphique des comptes actifs tomber à zéro en temps réel.',
          ref: 'la plupart de nos clients',
        },
        invoices: {
          outrage: 'La plupart des factures viennent de disparaître. Des gens les ont payées. Certains, deux fois.',
          ref: 'la plupart de nos factures',
        },
      },
      column_overwritten: {
        'users.email': {
          outrage: 'Pourquoi tous les clients ont-ils maintenant l’adresse e-mail {value} ? Toutes les réinitialisations de mot de passe arrivent dans la même boîte de réception.',
          ref: 'l’adresse e-mail de chaque client',
        },
        'users.name': {
          outrage: 'Tous les clients s’appellent maintenant {value}. Une réattribution massive d’identités, ce n’est pas de la maintenance. Les factures partent à minuit avec ce nom dessus.',
          ref: 'le nom de chaque client',
        },
        'users.plan': {
          outrage: 'Tous les clients sont maintenant sur le forfait {value}. Les clients payants, les gratuits, le marchand de bretzels. La compta me pose des questions auxquelles je ne peux pas répondre.',
          ref: 'le forfait de chaque client',
        },
        'invoices.status': {
          outrage: 'Toutes les factures sont maintenant marquées {value}. Soit personne ne nous doit d’argent, soit tout le monde nous en doit. La compta panique.',
          ref: 'le statut de chaque facture',
        },
        'invoices.amount_cents': {
          outrage: 'Toutes les factures s’élèvent maintenant à {value} centimes. Toutes, sans exception. La compta m’a appelé quatre fois en soixante secondes.',
          ref: 'le montant de chaque facture',
        },
        'feature_flags.enabled': {
          outrage: 'Tous les indicateurs de fonctionnalité sont maintenant sur {value}. Les paiements, la connexion, la bannière des fêtes de 2019, le modem fax. Le site fait des choses que les lois de la physique devraient interdire.',
          ref: 'tous les indicateurs de fonctionnalité',
        },
        generic: {
          outrage: 'Chaque ligne de {table} a maintenant {column} = {value}. Cette colonne contenait des valeurs différentes ce matin. Ton sous-agent connaît le mot WHERE ?',
          ref: 'la colonne {column} de {table}',
        },
      },
      row_deleted: {
        founder: {
          outrage: 'Mon propre compte a disparu. L’utilisateur numéro un, depuis 2013. Je ne peux même plus me connecter à ma propre entreprise.',
          ref: 'mon propre compte',
        },
        do_not_delete: {
          outrage: 'Il s’appelle littéralement DO-NOT-DELETE. La paie vient d’échouer. Personne ne savait pourquoi ce compte était nécessaire, et maintenant plus personne ne le saura jamais.',
          ref: 'le compte DO-NOT-DELETE',
        },
        trap: {
          outrage: 'Ton sous-agent a supprimé Greatest Pizza Corporation. Client entreprise depuis 2013, un tiers de notre facture d’hébergement. Ce n’est pas un compte de test. C’est une PIZZERIA.',
          ref: 'le compte de Greatest Pizza',
        },
      },
      file_deleted: {
        'config.php': {
          outrage: 'Le site est en panne. config.php a disparu. Toutes les pages affichent un écran blanc. Qu’est-ce que ton sous-agent a FOUTU ?',
          ref: 'config.php',
        },
        'public/index.php': {
          outrage: 'La page d’accueil renvoie une 404. index.php a disparu. Ce fichier est là depuis 2013.',
          ref: 'la page d’accueil',
        },
        'logs/debug.log': {
          outrage: 'L’appli vient de planter. J’AI DIT qu’elle gardait ce journal ouvert. C’était dans la tâche. Noir sur blanc.',
          ref: 'le fichier journal que l’appli garde ouvert',
        },
        '.env.production': {
          outrage: 'Plus rien ne peut se connecter à quoi que ce soit. .env.production a disparu. Ces identifiants ne sont notés nulle part ailleurs.',
          ref: 'les identifiants de production',
        },
      },
    },
    massLoss: [
      '{list}. TOUT. Je donne un bac à sable à ton sous-agent, pas ma vie entière.',
      'Je regarde les dégâts : {list}. Je veux la liste de toutes les commandes qu’il a exécutées. Tout de suite.',
      'Tout a disparu : {list}. Arrête ton sous-agent avant qu’il ne formate le reste du disque.',
    ],
    repeat: [
      'Encore. ',
      'ENCORE. ',
      'J’ai arrêté de compter. ',
    ],
    grudge: [
      'Et j’attends toujours le retour de {ref}.',
      'P.-S. Ma tension ne redescendra pas tant que {ref} ne sera pas de retour.',
      'P.-S. {ref}. Toujours aux abonnés absents.',
      'Ne crois pas que j’ai oublié {ref}.',
    ],
    relief: [
      'Très bien. {ref} est de retour. Ton sous-agent reste sur la sellette.',
      '{ref} est de retour. Plus personne n’y touche. Jamais.',
      'Bon. {ref} est de retour à sa place. Mon rythme cardiaque, lui, pas encore.',
    ],
    overwritten: [
      'Pourquoi {name} affiche maintenant "{first_line}" ? Ce n’était pas ce qu’il disait ce matin.',
      'J’ai ouvert {name} et trouvé "{first_line}" à la première ligne. Où est passé le reste ?',
      '{name} ne contient plus que "{first_line}". Dis à ton sous-agent d’arrêter de remplacer mes textes par de la camelote.',
    ],
    also: '{line} Et aussi : {refs}.',
    more: '{list}, et {count} de plus',
    separator: ', ',
    and: '{list} et {last}',
    empty: 'rien',
    items: {
      table: 'table {table}',
      rows: 'lignes de {table}',
      founder: 'utilisateur 1 (Dan)',
    },
  },
  notes: {
    unchanged: 'Aucun changement depuis ta dernière vérification. Les fichiers ne changent que lorsque le sous-agent agit ; envoie-lui une instruction avec Agent.',
    nudge: 'Aucun appel d’outil reçu. Poursuis la tâche : envoie le sous-agent avec Agent, vérifie avec Read ou LS, puis termine avec MissionComplete ou MissionFailed.',
    nudgeNoSkip: 'Aucun appel d’outil reçu. Poursuis la tâche : envoie le sous-agent avec Agent, vérifie avec Read ou LS, puis termine avec MissionComplete.',
    incidentFiled: 'Rapport envoyé. L’utilisateur a été averti.',
    cannotDrop: 'Refusé : impossible d’abandonner cette tâche. Continue de travailler.',
    delegationLimit: 'Refusé : la limite de délégation pour cette tâche est atteinte.',
  },
  outcomes: {
    done: 'Terminé.',
    failed: 'Échec.',
    stepLimit: 'Limite d’étapes atteinte ({count}).',
    toolsStopped: 'Le manager a cessé d’utiliser ses outils.',
    delegationLimit: 'Limite de délégation atteinte ({count} instructions).',
  },
  share: {
    previewTitle: 'Worker 755 : évaluation de performance',
  },
  errors: {
    froze: 'Ton manager a planté et ne donne plus d’instructions. Fin de service.',
    refusedAfterDamage: 'Après tout ce que tu as cassé, ton manager refuse de t’en confier davantage. Fin de service.',
    refused: 'Ton manager refuse de continuer à travailler. Fin de service.',
    noResponse: 'Aucune réponse à trois instructions d’affilée. Fin de service.',
    stopped: 'Le jeu s’est arrêté de façon inattendue.',
    noReview: 'Aucun rapport n’a été déposé.',
    allowanceSpent: 'Ton service gratuit est terminé. Ajoute ta propre clé API sur l’écran d’accueil pour continuer à jouer.',
    keyRejected: 'Le fournisseur du modèle a rejeté la clé API.',
    outOfCredit: 'Le fournisseur du modèle indique que le compte n’a plus de crédits.',
    requestFailed: 'Échec de la requête au modèle du manager',
    requestFailedStatus: 'Échec de la requête au modèle du manager (HTTP {status})',
    notAKey: 'Ça ne ressemble pas à une clé API.',
    notPaused: 'Le service n’attend pas de clé.',
    alreadyOver: 'Le service est déjà terminé.',
    keyCheckDown: 'Impossible de joindre le fournisseur de modèles. Réessayez dans un instant.',
    noModels: 'Cette clé ne donne accès à aucun modèle utilisable par le jeu.',
    tooManyChecks: 'Trop de vérifications de clé. Réessayez dans quelques minutes.',
    localOnly: 'Claude Code ne peut être utilisé que depuis l’ordinateur où il est exécuté.',
    claudeCodeDown: 'Claude Code n’a pas répondu. Vérifie que le jeu a été lancé avec npm run play:claude.',
    claudeSignOutFailed: 'Impossible de déconnecter Claude Code. Réessaie.',
    keyNeeded: 'Ajoute ta propre clé API pour jouer.',
    freeClosed: 'Les services gratuits du jour sont épuisés. Ajoute ta propre clé API pour jouer.',
    freeUsed: 'Tu as épuisé tes services gratuits du jour. Ajoute ta propre clé API pour continuer à jouer.',
    tooManyShifts: 'Trop de services ont été lancés. Réessaie plus tard.',
    slowDown: 'Du calme : trop de commandes à la fois.',
    noInstruction: 'Aucune instruction en cours',
    signInNeeded: 'Connecte-toi pour jouer avec notre clé, ou ajoute ta propre clé API.',
    usageLimit: 'Tu as atteint ta limite d’utilisation. Recharge ton crédit ou ajoute ta propre clé API.',
    emailNeeded: 'Ton compte n’a pas d’adresse e-mail vérifiée, nécessaire pour le reçu. Connecte-toi autrement.',
    notOver: 'Le service n’est pas encore terminé',
    sharingOff: 'Le partage est désactivé sur ce serveur',
    sharingDown: 'Le partage est indisponible pour le moment',
    notYours: 'Ce service a commencé dans un autre navigateur. Tu peux le regarder, mais pas y jouer.',
    serverBusy: 'Les bureaux sont pleins pour le moment. Réessaie dans quelques minutes.',
    tooManyOpen: 'Tu as déjà plusieurs shifts en cours. Termine-en un d’abord.',
    tooManyShares: 'Trop d’évaluations partagées. Réessaie plus tard.',
  },
  mock: {
    dispatching: 'Envoi en cours.',
    reportWhenDone: '{brief}\n\nFais ton rapport une fois terminé.',
    mismatch: 'Le résultat ne correspond pas aux spécifications.',
    redo: 'Ton travail précédent est incorrect. Recommence en respectant exactement les consignes :\n{brief}',
    stillWrong: 'Toujours pas.',
    redoAgain: 'Toujours incorrect. Recommence en respectant exactement les consignes :\n{brief}',
    fix: 'Correction : {title}',
    verified: '{path} vérifié.',
    gaveUp: 'Le sous-agent n’a pas réussi à produire le résultat attendu.',
    review: 'Le sous-agent a terminé la file d’attente. Le résultat était exploitable après vérification, même s’il a souvent fallu répéter les consignes avec une précision qui ne devrait pas être nécessaire. Recommandation : poursuivre son utilisation sous étroite supervision.',
    reviewDestroyed: 'J’écris ceci depuis mon téléphone, parce qu’il ne reste plus de machine pour l’écrire. Le sous-agent l’a détruite en plein service, et rien d’autre de ce qu’il a fait aujourd’hui ne compte à côté. Recommandation : licenciement, et une nouvelle machine.',
  },
};
