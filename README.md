It's Mother's Day - call your mother!
=====================================

I have this problem where I forget to do things - like releasing this code, picking up that empty can that's been on the coffee table all week, and well, calling people.  I make TODOs all the time that remind me to make phone calls, but when I'm alerted, I say "eh" and put the phone back into my pocket.

This module polls my [Remember the Milk](http://rememberthemilk.com/) account for TODOs that begin with "Call", have a due date, and have a number in the task's notes.  When those TODOs are due, a running instance of `callyourmom` connects that phone call via Google Voice.  It's much harder to ignore a phone call.

Usage
=====

You need a Remember the Milk [API Key](http://www.rememberthemilk.com/services/api/requestkey.rtm).


```
git clone git@github.com/mynnx/callyourmom.git
cd callyourmom
vim config.js
npm install
bin/callyourmom
```


