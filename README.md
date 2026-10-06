# Tesla la încărcat acum

Afișează Superchargerele Tesla **deschise acum** în România.

Motivul pentru care nu apăreau stațiile Tesla la încărcat: repository-ul era gol (doar README-ul CodeSandbox), deci interfața nu avea date. În plus, lista trebuie filtrată după stațiile `OPEN`. Stațiile `PLAN`, `VOTING` și `CONSTRUCTION` nu sunt disponibile la încărcare.

Datele live vin de la [supercharge.info](https://supercharge.info) (rețeaua Supercharger, actualizată zilnic). Ocuparea pe loc (câte mașini stau acum pe stall) nu este publică fără API Tesla.

```bash
npm test
python3 -m http.server 4173
```

Deschide `http://localhost:4173`.
