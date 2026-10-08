# Chrome Web Store listing

Copy for the Developer Dashboard. English is the default listing; Turkish goes under *Store listing → Add a language → Türkçe*.

## English

**Name**

```
Titleflix
```

**Summary** (132 characters max; this is 102)

```
Renames Netflix tabs to the show and episode you're watching, so bookmarks and tabs say what they are.
```

**Description**

```
Netflix names every tab "Netflix", so every Netflix bookmark is called "Netflix" too. Titleflix changes the tab title to what you're watching:

Stranger Things: S1:E2 Chapter Two: The Weirdo on Maple Street - Netflix
The Irishman - Netflix

Bookmark an episode with Ctrl+D (⌘D on Mac) and the bookmark keeps that name. Tab search, history and the tab strip show it too.

What it does
• Puts the show or movie name, season, episode number and episode title in the tab.
• Updates the title when autoplay or Next Episode moves on, and when you go back or forward.
• Puts the title back if Netflix resets it.
• Works in Netflix tabs that are already open when you install it.

Settings (click the Titleflix icon)
• Turn renaming on or off. It applies right away and doesn't reload your video.
• Leave out the season and episode details if you only want the show name.
• Keep or remove " - Netflix" at the end.
The popup also shows the exact title it set on the current tab.

Privacy
Titleflix only runs on www.netflix.com. There's no account, no analytics and no ads, and it doesn't send anything anywhere. It saves your three settings and nothing else.

New in 2.0
• Finds the title as soon as the video starts. The player controls no longer need to be on screen.
• Season numbers in titles.
• Redesigned popup with title format options.

Source code: https://github.com/doguyilmaz/titleflix
Problems or ideas: https://github.com/doguyilmaz/titleflix/issues

Titleflix is an independent project and isn't affiliated with Netflix.
```

## Türkçe

**Özet** (en fazla 132 karakter; bu 105)

```
Netflix sekmelerini izlediğin dizinin ve bölümün adıyla yeniden adlandırır, böylece yer imlerin karışmaz.
```

**Açıklama**

```
Netflix her sekmeye "Netflix" adını verir, bu yüzden her Netflix yer imi de "Netflix" diye kaydedilir. Titleflix sekme başlığını izlediğin şeyin adıyla değiştirir:

Stranger Things: S1:E2 Chapter Two: The Weirdo on Maple Street - Netflix
The Irishman - Netflix

Bir bölümü Ctrl+D (Mac'te ⌘D) ile yer imlerine eklediğinde bu ad kalır. Sekme araması, geçmiş ve sekme çubuğu da aynı adı gösterir.

Ne yapar
• Sekmeye dizi ya da film adını, sezonu, bölüm numarasını ve bölüm adını yazar.
• Otomatik oynatma ya da Sonraki Bölüm ile geçtiğinde, geri ya da ileri gittiğinde başlığı günceller.
• Netflix başlığı sıfırlarsa doğrusunu geri yazar.
• Kurduğunda zaten açık olan Netflix sekmelerinde de çalışır.

Ayarlar (Titleflix simgesine tıkla)
• Yeniden adlandırmayı aç ya da kapat. Hemen uygulanır, videon yeniden yüklenmez.
• Sadece dizinin adını istiyorsan sezon ve bölüm bilgisini kaldır.
• Sondaki " - Netflix" ekini tut ya da kaldır.
Açılır pencere, o sekmeye konan başlığı da gösterir.

Gizlilik
Titleflix yalnızca www.netflix.com'da çalışır. Hesap, analiz ya da reklam yok ve hiçbir yere veri göndermez. Sadece üç ayarını kaydeder.

2.0'da yeni
• Video başlar başlamaz başlığı bulur. Oynatıcı kontrollerinin ekranda olması gerekmiyor.
• Başlıklarda sezon numarası.
• Başlık biçimi seçenekleriyle yeni açılır pencere.

Kaynak kod: https://github.com/doguyilmaz/titleflix
Sorun ya da öneri: https://github.com/doguyilmaz/titleflix/issues

Titleflix bağımsız bir projedir, Netflix ile bağlantısı yoktur.
```

## Images

All files are in [`images/`](images/). Re-render with `bun run store:images` after changing the popup or [`images.html`](images.html).

| Slot | File | Size |
| --- | --- | --- |
| Screenshot 1 | `screenshot-1-tabs.png` | 1280×800 |
| Screenshot 2 | `screenshot-2-bookmarks.png` | 1280×800 |
| Screenshot 3 | `screenshot-3-popup.png` | 1280×800 |
| Screenshot 4 | `screenshot-4-episodes.png` | 1280×800 |
| Screenshot 5 | `screenshot-5-privacy.png` | 1280×800 |
| Small promo tile | `promo-small-440x280.png` | 440×280 |
| Marquee promo tile | `promo-marquee-1400x560.png` | 1400×560 |
| Store icon | `../assets/icons/icon128.png` | 128×128 |

## Privacy tab

**Single purpose**

```
Renames Netflix tabs to the title of the show or movie being played, so tabs and bookmarks can be told apart.
```

**Permission justifications**

Host permission (`https://www.netflix.com/*`):

```
Needed to read which show or movie is playing on Netflix and set the browser tab's title. The extension does not run on any other site.
```

`storage`:

```
Saves the user's three preferences: renaming on or off, whether to include episode details, and whether to add " - Netflix". No browsing or viewing data is stored.
```

`scripting`:

```
Used only when the extension is installed or updated, to start the extension's own bundled script in Netflix tabs that are already open, so users don't have to reload a video that is playing.
```

**Remote code:** No.

**Data usage:** tick "This item does not collect or use user data" and all three certifications.

**Privacy policy URL:** `https://github.com/doguyilmaz/titleflix/blob/main/PRIVACY_POLICY.md`
