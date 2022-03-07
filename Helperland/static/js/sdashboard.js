$(document).ready(function () {

  // logic for export 
  $('#export').click(function(){
    let data = document.getElementById('table');
    var fp = XLSX.utils.table_to_book(data,{sheet:'History'});
    XLSX.write(fp,{
      bookType:'xlsx',
      type:'base64'
    });
    XLSX.writeFile(fp, 'service-history.xlsx');
  });

  // Declare some global variable
  var today = new Date();
  var req = $("#req").val();
  today.setDate(today.getDate() + 1);
  var tommorrow =today.getFullYear() + "-" + ("0" + (today.getMonth() + 1)).slice(-2) + "-" + ("0" + today.getDate()).slice(-2);
  var currentpage = 1; // current page number
  var showrecords = $(".show-apge select").val(); // total records shown in select input
  var totalpage = 1;
  var records = [];
  var totalrecords = 0;

  switch (req) {
    case "setting":
      break;
    default:
      getDefaultRecords();
      setTimeout(setDefault, 100);
  }

  // this pagination logic to increase or decrease a page number
  $(document).on("click", ".paginations div", function () {
    var actionclass = $(this).prop("class");
    switch (actionclass) {
      case "jump-left":
        currentpage = 1;
        break;
      case "next-left":
        if (currentpage > 1) {
          currentpage--;
        }
        break;
      case "next-right":
        if (currentpage < totalpage) {
          currentpage++;
        }
        break;
      case "jump-right":
        currentpage = totalpage;
        break;
    }
    updatePageNumber(currentpage);
    getAjaxDataByReq();
  });

  // for avtar selection
  $(document).on("click", "#avatars img", function (e) {
    $("#avatars img").removeClass("selected");
    $(this).addClass("selected");
    var imgname = $(this).prop("alt");
    $(".account-header img").prop(
      "src",
      "./static/images/avtar/" + imgname + ".png"
    );
    $(".account-header img").prop("alt", imgname);
  });

  //update hidden mobile field value 
  $(document).on("keyup", "#phonenumber", function(){
    var mobile = $(this).val();
    $("#add-mobile").val(mobile);
  });

  // save setting tab user detailes
  $(document).on("click", "#servicersave", function (e) {
    e.preventDefault();
    if($(this).parent().find('.error').length==0){
      var action = $(this).parent().prop("action");
      var avtar = $("#avatars img.selected").prop("alt");
      var data = $(this).parent().serialize() + "&profilepicture=" + avtar;
      jQuery.ajax({
        type: "POST",
        url: action,
        datatype: "json",
        data: data,
        success: function (data) {
          console.log(data);
          var obj = JSON.parse(data);
          if (obj.errors.length == 0) {
            $("#firstname").val(obj.result.FirstName);
            $(".header-image span").text(obj.result.FirstName);
            $("#lastname").val(obj.result.LastName);
            $("#phonenumber").val(obj.result.Mobile);
            $("#email").val(obj.result.Email);
            if (obj.result.DateOfBirth == null) {
              var date = new Date("Y-m-d", obj.result.DateOfBirth);
              $("#birthdate").val(date);
            }
            if (obj.addid != 0) {
              $("#addid").val(obj.addid);
            }
            $("#form-usersave").prepend(
              '<div class="alert alert-success alert-dismissible fade show" role="alert"><ul class="success">user saved Successfully!!</ul><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>'
            );
          } else {
            var errorlist = "";
            for (const [key, val] of Object.entries(obj.errors)) {
              errorlist += `<li>${val}</li>`;
            }
            $("#form-usersave").prepend(
              '<div class="alert alert-danger alert-dismissible fade show" role="alert"><ul class="error">' +
                errorlist +
                '</ul><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>'
            );
          }
        },
        complete: function (data) {
          $.LoadingOverlay("hide");
        },
      });
    }
    $([document.documentElement, document.body]).animate({
        scrollTop: $("#nav-tab").offset().top,
      },100);
  });

  // update city select option according to postal code
  $(document).on("keyup", "#add-postal", function (e) {
    var postal = $(this).val();
    if (postal.length == 5) {
      $(".error").remove();
      showLoader();
      jQuery.ajax({
        type: "POST",
        url: "http://localhost/Tatvasoft-PSD-TO-HTML/HelperLand/?controller=Users&function=getCityByPostal",
        datatype: "json",
        data: { postalcode: postal },
        success: function (data) {
          var obj = JSON.parse(data);
          if (obj.errors.length == 0) {
            var option ="<option value=" + obj.result.CityName.toLowerCase() +" selected>" + obj.result.CityName + "</option>";
            $("#city").html(option);
          } else {
            $("#city").html("");
            $("#add-postal").after(
              "<span class='error'>*invalid postal code</span>"
            );
          }
        },
        complete: function (data) {
          $.LoadingOverlay("hide");
        },
      });
    } else {
      $("#city").html("");
      $.LoadingOverlay("hide");
    }
  });

  // when user want to update password
  $(document).on("click", "#btn-updatepassword", function(e){
    e.preventDefault();
    if($(this).parent().parent().find('.error').length==0){
      var action = $(this).parent().parent().prop("action");
      showLoader();
      jQuery.ajax({
        type: "POST",
        url: action,
        datatype: "json",
        data: $("#form-changepassword").serialize(),
        success: function (data) {
          console.log(data);
          var obj = JSON.parse(data);
          if(obj.errors.length==0){
            $("#form-changepassword").prepend('<div class="alert alert-success alert-dismissible fade show" role="alert"><ul class="success">Password Changed Successfully!!</ul><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>');
          }else{
            var errorlist = "";
            for (const [key, val] of Object.entries(obj.errors)) {
              errorlist += `<li>${val}</li>`;
            }
            $("#form-changepassword").prepend('<div class="alert alert-danger alert-dismissible fade show" role="alert"><ul class="errorlist">' +errorlist +'</ul><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>');
          }
          $("#form-changepassword").trigger("reset");
        },
        complete: function (data) {
          $.LoadingOverlay("hide");
        },
      });
    }
  });

  // this is function to set default thinks or call by timeout vecause of late ajax responce
  function setDefault() {
    totalrecords = $(".show-apge .totalrecords").text();
    totalpage = Math.ceil(totalrecords / showrecords);
    totalpage = totalpage == 0 ? 1 : totalpage;
    getAjaxDataByReq();
  }

  // this is a function get total records from database
  function getDefaultRecords() {
    $.ajax({
      type: "POST",
      url:
        "http://localhost/Tatvasoft-PSD-TO-HTML/HelperLand/?controller=SDashboard&function=TotalRequest&parameter=" +
        req,
      datatype: "json",
      success: function (data) {
        console.log(data);
        var obj = JSON.parse(data);
        var totalrequest = obj.result.Total;
        $(".show-apge .totalrecords").text(totalrequest);
      },
    });
  }

  // this is a function to get service data according to currentpage, showrecords and apge request
  function getAjaxDataByReq() {
    showLoader();
    $.ajax({
      type: "POST",
      url:
        "http://localhost/Tatvasoft-PSD-TO-HTML/HelperLand/?controller=SDashboard&function=ServiceRequest&parameter=" +
        req,
      datatype: "json",
      data: { pagenumber: currentpage, limit: showrecords },
      success: function (data) {
        console.log(data);
        //alert(data);
        obj = JSON.parse(data);
        $("table tbody").html("");
        if (obj.errors.length == 0) {
          records = obj.result;
          console.log(records);
          switch (req) {
            case "dashboard":
              setDashboard(obj.result);
              break;
            case "newservice":
              setNewRequest(obj.result);
              break;
            case "upcoming":
              setUpcomingRequest(obj.result);
              break;
            case "history":
              setHistory(obj.result);
              break;
            case "ratings":
              setRatings(obj.result);
            case "block":
              setBlocks(obj.result);
            case "schedule":
              break;
            case "setting":
              break;
            default:
              setDashboard(obj.result);
          }
        }
      },
      complete: function (data) {
        $.LoadingOverlay("hide");
      },
    });
  }

  // for updating page number
  function updatePageNumber(number) {
    if (totalpage < currentpage) {
      number = totalpage;
    }
    $(".paginations .current-page").text(number);
  }

  // thhi is a function to update pagination when somebody change show records dropdown
  $(document).on("change", ".show-apge select", function () {
    showrecords = $(this).val();
    totalpage = Math.ceil(totalrecords / showrecords);
    totalpage = totalpage == 0 ? 1 : totalpage;
    currentpage = 1;
    updatePageNumber(currentpage);
    getAjaxDataByReq();
  });

   // get time and date in required format
   function getTimeAndDate(sdate, stime) {
    //alert(sdate, stime);
    var dateobj = new Date(sdate);
    var startdate = dateobj.toLocaleDateString("en-AU");
    var starttime =
      ("0" + dateobj.getHours()).slice(-2) +
      ":" +
      ("0" + dateobj.getMinutes()).slice(-2);
    var totalhour = stime;

    var endhour = dateobj.getHours() + Math.floor(totalhour);
    var endmin =
      (totalhour - Math.floor(totalhour)) * 60 + dateobj.getMinutes();
    if (endmin >= 60) {
      endhour = endhour + Math.floor(endmin / 60);
      endmin = (endmin / 60 - Math.floor(endmin / 60)) * 60;
    }
    var endtime = ("0" + endhour).slice(-2) + ":" + ("0" + endmin).slice(-2);
    return { startdate: startdate, starttime: starttime, endtime: endtime };
  }

   // this is logic to making star html for sp rating
   function getStarHTMLByRating(avgrating) {
    spstar = "";
    var i = 0;
    for (i = 0; i < Math.floor(avgrating); i++) {
      spstar += '<span class="fa fa-star"></span>';
    }
    if (Math.floor(avgrating) < avgrating) {
      i++;
      spstar += '<span class="fa fa-star-half-o"></span>';
    }
    if (i < 5) {
      for (var j = 0; j < 5 - i; j++) {
        spstar += '<span class="fa fa-star-o"></span>';
      }
    }
    return spstar;
  }

  // find status of rating
  function getRatingStatus(rating){
    var rat = Math.floor(rating);
    var status = "";
    switch(rat){
      case 5: status = "Excellent"; break;
      case 4: status = "Very Good"; break;
      case 3: status = "Good"; break;
      case 2: status = "Poor"; break;
      case 1: status = "Very Poor"; break;
    }
    return status;
  }


  function setDashboard(results){
    $(".request-count.blue").text(results.new);
    $(".request-count.green").text(results.upcoming);
    $(".request-count.red").text(results.paymentdue);
  }
  function setNewRequest(results){
    var html = '';
    var i=0;
    results.forEach((result) => {
      var date = getTimeAndDate(result.ServiceStartDate, result.ServiceHours);
      html+=`
      <tr id='data_${i}'>
        <td scope="row" style="line-height: 50px;">${("000" + result.ServiceRequestId).slice(-4)}</td>
        <td>
            <div class="td-date"><img src="static/images/icon-calculator.png" alt=""><b>${date.startdate}</b></div>
            <div class="td-time"><img src="static/images/icon-time.png" alt="">${date.starttime}-${date.endtime}</div>
        </td>
        <td>
            <div class="td-name" style='padding-left: 26px;'>${result.FirstName} ${result.LastName}</div>
            <div class="td-address"><img src="./static/images/icon-address.png" style='margin-bottom: 8px;'>${result.AddressLine1} ${result.AddressLine2}, ${result.PostalCode} ${result.City}</div>
        </td>
        <td>${result.TotalCost}€</td>
        <td></td>
        <td class="btn-accept"><button data-bs-toggle="modal" data-bs-target="#exampleModalServiceAccept" data-bs-dismiss="modal">Accept</button></td>
      </tr>
      `;
    });
    $("table tbody").html(html);
  }
  function setUpcomingRequest(results){
    var html = '';
    var i=0;
    results.forEach((result) => {
      var date = getTimeAndDate(result.ServiceStartDate, result.ServiceHours);
      html+=`
      <tr id='data_${i}'>
        <td scope="row" style="line-height: 50px;">${("000" + result.ServiceRequestId).slice(-4)}</td>
        <td>
            <div class="td-date"><img src="static/images/icon-calculator.png" alt=""><b>${date.startdate}</b></div>
            <div class="td-time"><img src="static/images/icon-time.png" alt="">${date.starttime}-${date.endtime}</div>
        </td>
        <td>
            <div class="td-name" style='padding-left: 26px;'>${result.FirstName} ${result.LastName}</div>
            <div class="td-address"><img src="./static/images/icon-address.png" style='margin-bottom: 8px;'>${result.AddressLine1} ${result.AddressLine2}, ${result.PostalCode} ${result.City}</div>
        </td>
        <td style="line-height: 50px;"></td>
        <td class="btn-cancel"><button data-bs-toggle="modal" data-bs-target="#exampleModalServiceCancel" data-bs-dismiss="modal">Cancel</button></td>
      </tr>
      `;
    });
    $("table tbody").html(html);
  }
  function setHistory(results){
    var html = '';
    var i=0;
    results.forEach((result) => {
      var date = getTimeAndDate(result.ServiceStartDate, result.ServiceHours);
      html+=`
      <tr id='data_${i}'>
        <td scope="row" style="line-height: 50px;">${("000" + result.ServiceRequestId).slice(-4)}</td>
        <td>
            <div class="td-date"><img src="static/images/icon-calculator.png" alt=""><b>${date.startdate}</b></div>
            <div class="td-time"><img src="static/images/icon-time.png" alt="">${date.starttime}-${date.endtime}</div>
        </td>
        <td>
            <div class="td-name" style='padding-left: 26px;'>${result.FirstName} ${result.LastName}</div>
            <div class="td-address"><img src="./static/images/icon-address.png" style='margin-bottom: 8px;'>${result.AddressLine1} ${result.AddressLine2}, ${result.PostalCode} ${result.City}</div>
        </td>
      </tr>
      `;
    });
    $("table tbody").html(html);
  }
  function setRatings(results){
    var html = '';
    var i=0;
    results.forEach((result) => {
      var date = getTimeAndDate(result.ServiceStartDate, result.ServiceHours);
      var comment = (result.Comments=="") ? "No Comment" : result.Comments;
      var spstar = getStarHTMLByRating(+result.Ratings);
      var starstatus = getRatingStatus(+result.Ratings);
      html+=`
      <div class="row" id='data_${i}'>
            <div class="col-3 row-col">
                <div>${("000" + result.ServiceRequestId).slice(-4)}</div>
                <div class="td-name">${result.FirstName} ${result.LastName}</div>
            </div>
            <div class="col-3 row-col">
                <div class="td-date"><img src="./static/images/icon-calculator.png" alt=""><b>${date.startdate}</b></div>
                <div class="td-time"><img src="./static/images/icon-time.png" alt="">${date.starttime}-${date.endtime}</div>
            </div>
            <div class="col row-col">
                <div>Ratings</div>
                <div class="info-ratings">
                    ${spstar}
                    ${starstatus}
                </div>
            </div>
            <div class="row row-comment">
                <div>Customer Comment</div>
                <div class="rating-comment">${comment}</div>
            </div>
        </div>
      `;
    });
    $("#userrating").html(html);
  }
  function setBlocks(results){
    var html = '';
    var i=0;
    results.forEach((result) => {
      html+=`
      <div class="pro" id='data_${i}'>
                <div class="pro-avtar">
                    <img src="./static/images/avtar/avtar1.png">
                </div>
                <div class="pro-name">${result.FullName}</div>
                <div class="pro-button">
                    <button class="button-block">Block</button>
                </div>
      </div>
      `;
    });
    $(".pros").html(html);

  }

});
