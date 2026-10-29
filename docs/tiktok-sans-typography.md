# TikTok Sans w pipeline shortów finansowych

Pipeline używa `TikTokSans-Bold.ttf` jako głównego kroju napisów ASS i plansz SVG. Font zastępuje Montserrat, ponieważ lepiej pasuje do krótkich, mobilnych formatów: jest ciężki, nowoczesny i zachowuje czytelność przy dużych liczbach oraz procentach.

Asset zawiera połączone podzbiory Latin i Latin-Ext, więc obejmuje polskie znaki oraz cyfry. Jest kopiowany do obrazu Docker przez `COPY . .`, a renderer przekazuje katalog `fonts/` do libass przez `fontsdir`.

W interfejsie hooki i liczby korzystają z TikTok Sans Bold, a informacje pomocnicze deklarują rodzinę TikTok Sans. Font jest dostępny na licencji SIL Open Font License 1.1; kopia licencji znajduje się w `fonts/TikTokSans-OFL.txt`.

Wybór opiera się na aktualnym kierunku typografii short-form: ciężki sans-serif, duża typografia jako element obrazu oraz kontrola szerokości dla szybkich, czytelnych hooków. Źródło fontu: [oficjalne repozytorium TikTok Sans](https://github.com/tiktok/TikTokSans).
