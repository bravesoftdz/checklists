  /*
  Description: Auth module. Allows to login/logout.

  */

  const {
    Pool
  } = require('pg');
  const config = require('../../config/config');

  const pool = new Pool({
    user: config.pguser,
    host: config.pghost,
    database: config.pgdb,
    password: config.pgpass,
    port: config.pgport
  })
  const validate = require('uuid-validate');

  exports.logout = function(req, res) {
    /*
    Perform log out
    */


    //  '00000000-0000-0000-0000-000000000000'
    res.cookie('session', '00000000-0000-0000-0000-000000000000');
    // and more.. we shall kill session in database...

    res.redirect('../login');

    console.log('Perform log out');
  };


  exports.test = function(req, res) {
    console.log(req);
    res.send('test');
  };


  exports.checksession = function(req, res, next) {
    /*
    Perform session check as middleware: if session is not ok - quits app to login dialog
    */

    //  console.log(req);
    const data = {
      cookie: req.cookies.session,
      inrender: req.query.inrender ||false
    };

    if (validate(data.cookie) !== true) {
      data.cookie = '00000000-0000-0000-0000-000000000000';
    };

    /*


    pool.query('delete  from tmp_sys_sessions where dts < now()', [], (err, result) => {
      console.log(err);
      console.log('obsolet sessions cleared: '+result.rowCount)
    });
*/

    pool.query('SELECT id,dts FROM tmp_sys_sessions WHERE id=$1 and dts>now()', [data.cookie], (err, result) => {
      if (err) {
        console.log('SQL error');
        //return 
        //console.error('Error executing query', err.stack);
        //res.render('login');
       // res.redirect('../login');
        res.status(403).send('');
        //console.log('login rendered 1');
      } else {
        if (result.rowCount === 1) {
          //console.log('checksession session Ok');
          next();
        } else {
          //console.log('checksession session FAIL!!!');
          //res.render('login');
          if (data.inrender){
          //res.render('',data);
          res.status(403).send('');
          } else {
          res.redirect('../login');
          }
          //console.log('login rendered 2');

        }

      };
    })

  };


  exports.login = function(req, res) {
    /*
    Perform log in
     */

    const data = {
      name: req.body.userName,
      pass: req.body.userPassword
    };
    console.log(data);
    let resp ={
      message:''
    };

    if (req.method === 'GET') {
      res.render('login');
      //console.log('login rendered 1');

    } else {

      pool.query('SELECT id FROM ref_sys_users WHERE state=0 and (email=$1 or name=$1)  and pass=$2', [data.name, data.pass], (err, result) => {
        if (err) {
          resp.message =  err.stack;
          //console.log('SQL error');
          //console.error('Error executing query', err.stack);
          res.render('login',resp);
          //console.log('login rendered 2');
        } else {
          //console.log(result.rowCount);
          if (result.rowCount === 1) {
            pool.query('Insert into tmp_sys_sessions (user_id) values ($1) returning id as session, dts as untill', [result.rows[0].id], (err, result) => {
              if (err) {
                //console.log('SQL session error');
                //console.error('Error executing query', err.stack);
                //error creating session
                res.render('login');
                //console.log('login rendered 3');
              } else {
                res.cookie('session', result.rows[0].session);
                //console.log(req.originalUrl); // '/admin/new'
                //console.log(req.baseUrl); // '/admin'
                //console.log(req.path); // '/new'
                //   res.render('dashboard'); //по идее надо сделать редирект, и он уже будет с кукой
                res.redirect('../../home')
              }
            });
          } else {
            //user not found
            res.render('login');
            //console.log('login rendered 4');
          }
        };
      });
    }
  };

  exports.getUserMenu = function(req, res) {
    /*
    Perform session check and return menu items
    */
    const data = {
      cookie: req.cookies.session
    };

  var Sync = require("sync");
  var getChilds = function (qquery, array, is_first,callback)
    {
        pool.query(qquery, array, function(error, result)
        {
            Sync(() => {
            if (error)
            {
                console.log(error);
            }
            else
            {
                let lines = "";
                for (var i = 0; i < result.rowCount; i++)
                {
                    let html_line = "";
                    if (result.rows[i].isparent != 0)
                    {
                        let htmlline = getChilds.sync(null, "SELECT (select count(id) from ref_sys_menuitems where m.id = parent) AS isparent," + 
                        "m.id, m.icon, m.name, m.path from ref_sys_menuitems m where m.parent = $1 order by m.sortorder",
                        [result.rows[i].id], false);
                        html_line = `<li class="${(is_first) ? 'first' : 'dropdown-submenu'}">
                        <a class="list ${result.rows[i].icon}" data-toggle="dropdown" href="#">&nbsp;${result.rows[i].name}<span class="caret"></span></a>
                        <ul class="dropdown-menu">
                            ${htmlline}
                        </ul>
                        </li>\n`;
                    }
                    else
                    {
                      html_line = `<li><a class=${result.rows[i].icon} href=${result.rows[i].path}>&nbsp;${result.rows[i].name}</a></li>\n`;
                    }
                    lines += html_line;
                }
                callback(null, lines);
            }
            })
        });
    }

  Sync(function()
  {
    var data = getChilds.sync(null, 'SELECT (select count(id) as q from ref_sys_menuitems where parent=m.id)as isparent, '+
    ' m.id,  '+
    ' m.icon, '+
    ' m.name as name, m.path as path FROM ref_sys_menuitems m ' +
    ' inner join ref_sys_users_x_rights r on r.right_id=m.right_id and r.state=0 ' +
    ' inner join tmp_sys_sessions ss on r.user_id=ss.user_id '+
    ' where m.parent is null and ss.id=$1 and m.application_id=$2' +
    ' order by m.sortorder ',
    ["85c228a2-db5b-402d-a924-853570129af4", "6eb63ba3-5c35-494d-af56-aa1526aa0964"], true);
    res.send(data);
  });
  };