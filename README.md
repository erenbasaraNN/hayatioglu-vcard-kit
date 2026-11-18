# Hayatioğlu Dijital Kartvizit

Kişi başına bir JSON dosyasından web kartviziti, vCard 3.0 dosyası ve iletişim QR kodu üretir. Üretilen sayfalar statiktir. Node.js yalnızca dosyaları üretmek ve yerelde önizlemek için gerekir.

## İlk çalıştırma

Repo klasöründe Node.js 22 veya üzeri ve npm ile şu komutları çalıştırın.

```sh
npm ci
npm run build
npm run preview
```

Yerelde açılacak örnekler

- [Eren Başaran](http://127.0.0.1:4173/vcard/eren-basaran/)
- [Sinan Topaç](http://127.0.0.1:4173/vcard/sinan-topac/)

## Sık yapılan işlemler

| İşlem | Yapılacak değişiklik |
| --- | --- |
| Telefon, unvan veya e-posta güncelle | `contacts/` altındaki kişinin JSON dosyasını düzenle, ardından `npm run build` çalıştır. Sayfa, vCard ve QR kodu birlikte güncellenir. |
| Yeni kişi ekle | `contacts/eren-basaran.json` dosyasını örnek al. `ayse-yilmaz.json` gibi bir ad ver, bilgileri gir ve portreyi `assets/portraits/` klasörüne koy. |
| Fotoğraf değiştir | JPG, PNG veya WebP dosyasını `assets/` altına ekle. JSON’daki `photo` alanına `portraits/ayse-yilmaz.jpg` gibi, `assets/` klasörüne göre yolu yaz. Kare portre kullan. |
| WhatsApp kısayolunu yönet | `"whatsapp": true` cep numarasını kullanır. Ayrı hat varsa uluslararası numarayı yaz. Alanı silmek veya `false` vermek kısayolu gizler. |
| Sabit hat veya adres ekle | `contacts/sinan-topac.json` içindeki `workPhone` ve `address` alanlarını örnek al. Sabit hat hem kartta hem vCard’da yer alır. |
| Bir kişiye özel web adresi ver | JSON’a `"website": "https://ornek.com/"` ekle. Alan yoksa `site.json` içindeki kurum sitesi kullanılır. `"website": null` ile web kısayolu gizlenir. |
| Ortak logo ve kurum bilgilerini değiştir | `site.json` dosyasını düzenle. Logo yolu `assets/` klasörüne göredir. Şeffaf, yatay PNG önerilir. |
| Kartı kaldır | İlgili kişi JSON’unu sil ve yeniden üret. Sunucudaki eski kart klasörünü de kaldır. |

Dosya adı URL’yi belirler. Örneğin `contacts/ayse-yilmaz.json` → `/vcard/ayse-yilmaz/`. Dosya adında küçük Latin harfleri, rakam ve kısa çizgi kullan. Mevcut QR/NFC etiketleri bir web sayfasını açıyorsa dosya adını değiştirmeden bilgileri güncelle.

### Yeni kişi için en küçük örnek

Bu örneği `contacts/ayse-yilmaz.json` olarak kaydedin ve kendi portre dosyanızın yolunu yazın.

```json
{
  "$schema": "../schema/contact.schema.json",
  "givenName": "Ayşe",
  "familyName": "Yılmaz",
  "photo": "portraits/ayse-yilmaz.jpg",
  "mobile": "+905551234567",
  "whatsapp": true
}
```

Zorunlu alanlar `givenName`, `familyName` ve `photo`. `mobile` ve `workPhone` için boşluksuz uluslararası format kullan. Opsiyonel iletişim bilgileri girilmediğinde ilgili kısayollar görünmez. JSON şemaları editörde alan önerileri sağlar ve üretim sırasında dosyaları doğrular.

## Kendi sunucunuza yükleme

```sh
npm ci
npm run build
```

Varsayılan `basePath` değeri `/vcard`. `dist/` klasörünün **içeriğini** web köküne yükleyin. Örneğin `dist/vcard/sinan-topac/index.html` dosyası `https://alanadiniz.com/vcard/sinan-topac/` adresinde açılır. Farklı bir dizinde yayınlamak için `site.json` içindeki `basePath` değerini değiştirip yeniden üretin. Doğrudan web kökü için `"/"` kullanın.

- Dizin isteklerinde sunucu `index.html` dosyasını sunmalı. Sondaki eğik çizgiyi standartlaştırmak için sunucuda yönlendirme kullanılabilir.
- `.vcf` yanıtlarını `Content-Type: text/vcard; charset=utf-8` ve `Content-Disposition: inline` başlıklarıyla sunun. **Rehbere Kaydet**, tarayıcının kişi kartını açma davranışını kullanır. Bazı cihazlar dosyayı indirir.
- Güncellemede yeni `dist/` çıktısını yayınlayın. Silinen veya adı değişen kişi klasörlerini de yayından kaldırmak için çıktı dizinini bütün olarak değiştirin ya da ilgili eski klasörleri temizleyin.
- NFC etiketine kartın yayınlanan HTTPS adresini yazın. Kartın içindeki QR ise iletişim bilgilerini doğrudan taşır. Üretimde ayrı bir `<isim>-qr.png` dosyası da oluşur.

## Repo düzeni

```text
contacts/       Kişi başına bir JSON
assets/         Portreler, logo ve yerel yazı tipleri
site.json       Ortak kurum bilgileri ve yayın yolu
schema/         JSON doğrulama ve editör önerileri
src/            Ortak HTML şablonu ve kart üretim kodu
scripts/        Üretim ve yerel önizleme komutları
dist/           Üretilen, sunucuya yüklenebilir çıktı (Git dışında)
```

Her kişi için `index.html`, `<isim>.vcf` ve `<isim>-qr.png` üretilir. Portre, logo, yazı tipleri ve QR görseli HTML’ye gömülür. Üretilen `index.html` dosyası doğrudan açılarak çevrimdışı önizlenebilir.
