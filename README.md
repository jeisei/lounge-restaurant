# Lounge

Портфоліо-проєкт ресторану з вигаданою адресою та номером. Лендинг показує анімацію вина у відповідь на прокрутку. Окрема сторінка меню підтримує пошук і зберігає обране в браузері.

## Запуск

Потрібен Node.js 24.

```sh
npm ci
npm run dev
```

`npm run build` збирає статичні `index.html` і `menu.html` у `dist/`. Обидві сторінки можна переглянути через `npm run preview`.

Netlify використовує `netlify.toml` для збірки на Node.js 24 і публікує папку `dist/`.

## Структура

- `index.html`, `src/style.css` і `src/main.js` відповідають за лендинг та мобільну навігацію.
- `src/opening.js` перемикає відео наливання та Canvas-сцену з прокруткою через GSAP ScrollTrigger. Сцена використовує CSS sticky та показує статичний кадр у режимі зменшеного руху.
- `src/wine-photo.js` обчислює рівень рідини в перерізі чаші й компонує його з відблисками з відео. `src/spill.js` малює бризки і перехід до привітання.
- `src/navigation.js` і `src/motion.css` містять спільну логіку прокрутки та візуальні переходи між сторінками.
- `menu.html`, `src/menu.js` і `src/menu.css` містять локальний каталог, бокову навігацію, пошук, картки та обране. URL із фрагментом відкриває конкретний розділ або категорію. Обране зберігається в браузері.
- `src/menu-data.json` містить знімок каталогу з назвами, цінами, категоріями та доступними позначками. Усі фото каталогу завантажуються з `public/media/menu/`.

## Джерела

- [Відео наливання, Kindel Media / Pexels](https://www.pexels.com/video/pouring-wine-in-a-glass-8093236/)
- [Фото аркових вікон, Alex Lion / Unsplash](https://unsplash.com/photos/two-arched-windows-glow-warmly-on-a-dark-brick-building-t1-x9i8c10Y)
- [Дані й фото страв, ChoiceQR](https://terasaresto.choiceqr.com/section:menyu)
- [Вихідні фотографії для розділу «Простір»](https://terasaresto.choiceqr.com/)
