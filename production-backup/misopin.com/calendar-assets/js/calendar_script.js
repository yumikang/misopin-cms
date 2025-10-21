
function all_checked(sw){
    var f = document.fboardlist;
    for (var i = 0; i < f.length; i++) {
        if (f.elements[i].name == "chk_wr_id[]") f.elements[i].checked = sw;
    }
    return;
}

function check_confirm(str){
    var f = document.fboardlist;
    var chk_count = 0;
    for (var i = 0; i < f.length; i++) {
        if (f.elements[i].name == "chk_wr_id[]" && f.elements[i].checked) chk_count++;
    }
    if (!chk_count) {
        alert(str + "할 예약내역을 선택하세요.");
        return false;
    }
    return true;
}

function selectday(link,day,holiday,week,type,time){
    $.ajax({
        url:link+"/ajax/calendar_time.ajax.php",
        type: "POST",
        data: {
            "day": day,
            "bo_table": g5_bo_table,
            "holiday": holiday,
            "week": week,
            "type": type
        },
        dataType: "json",
        success: function(data, textStatus) {
            $('#sh_checktime').html(data.choice_time);
            if (type) {
                $('#time_close_list').html(data.mobile_time);
            }
            if (time) {
                $('#sh_checktime').val(time);
            }
        }
    });
    $('#sh_checkday').val(day);
}

function calendar_click(link,obj,time) {
    $.ajax({
        url: link+"/ajax/calendar_click.ajax.php",
        type: "POST",
        data: {
            "var": obj,
            "bo_table": g5_bo_table
        },
        dataType: "json",
        success: function(data,textStatus) {
            selectday(link,obj,data.holiday_ck,data.sh_k,'',time);
        }
    });
}

function calendar_inqClose() { 
	$("#calendar_form").fadeOut(200);
}

function calendar_inqOpen() { // inqOpen() 실행시 팝업 띄움
    $("#calendar_form").appendTo("body");
	$("#calendar_form").fadeIn(200);

    var maxdate = $('input[name=max_date]').val();
    var today_date = $('input[name=today_date]').val();
    var link = $('input[name=link]').val();

    // 사용하지않는 요일 달력에서 제거
    var week_basics = [0,1,2,3,4,5,6];
    var week = $('input[name=week]').val().split('|');
    var week_arr = week.map(function(item) {
        return parseInt(item) - 1; // 각 요소를 정수로 변환 후 1을 빼줍니다.
    });
    var no_week = week_basics.filter(function(item) {
        return week_arr.indexOf(item) === -1; // weekArray에 포함되지 않는 요소들을 필터링합니다.
    });

    var holiday = $('input[name=holiday]').val();
    let date_chk = false;
    let holiday_arr = [];

    $('#sh_checkday').datepicker({
        changeMonth: true,
        changeYear: true,
        showButtonPanel: true,
        dateFormat: "yy-mm-dd",
        yearRange: "c-1:c+1",
        maxDate: "+" + maxdate + "d",
        minDate: today_date + "d",
        beforeShowDay: function(date) {
            // 요일을 가져옵니다. (0: 일요일, 1: 월요일, ..., 6: 토요일)
            var day = date.getDay();
            // 요일이 체크되지않으면 선택불가
            if (no_week.indexOf(day) !== -1) {
                return [false];
            }
            var date = $.datepicker.formatDate("yy-mm-dd", date);  
            if (!holiday && !date_chk) {
                date_chk = true;
                // 날짜를 yy-mm-dd 형식으로 변환합니다.          
                $.ajax({
                    url: link+"/ajax/holiday_find.ajax.php",
                    type: "POST",
                    data: {
                        "day": date
                    },
                    async:false,
                    dataType: "json",
                    success: function(data) {
                        holiday_arr = data.result;
                    }
                });
            }
            if ($.inArray(date, holiday_arr) != -1) {
                return [false];
            }
            return [true];

        },
        onSelect: function(date) {
            calendar_click(link,date, ''); // 선택된 날짜를 인자로 전달
        }
    });
    
    $('#sh_birth').datepicker({
        changeMonth: true,
        changeYear: true,
        showButtonPanel: true,
        dateFormat: "yy-mm-dd",
        yearRange: "c-100:c+100",
        maxDate: "0",
    });
};

function close_date(link,type,date,time){
	$.ajax({
	url: link+"/ajax/close_date.ajax.php",
	type: "POST",
    dataType: "html",
	data: {
		"type": type,
		"date": date,
		"time": time,
        "bo_table": g5_bo_table
        },
        dataType: "html",
        success: function(data) {
            alert(data);
            location.reload();
        }
	});
}

function movePage(select){
    console.log('movePage called with:', select);
    console.log('g5_bo_table:', typeof g5_bo_table !== 'undefined' ? g5_bo_table : 'undefined');

    if (select) {
        // g5_bo_table이 정의되어 있는지 확인
        if (typeof g5_bo_table === 'undefined') {
            console.error('g5_bo_table is not defined');
            // g5_bo_table이 없으면 기본값 사용
            document.location.replace("?select=" + select);
        } else {
            document.location.replace("?bo_table=" + g5_bo_table + "&select=" + select);
        }
    } else {
        window.alert("이용할 수 없는 예약일자를 선택하였습니다.");
    }
    return;
}

// 전역으로 노출
window.movePage = movePage;

//캘린더 start
function rsv_chk(link,type){
    calendar_inqClose();
	var name = $("#name").val();
	var phone = $("#phone").val();
	var birth = $("#birth").val();
	$.ajax({
	url: link+"/ajax/rv_check.ajax.php?bo_table="+g5_bo_table,
	type: "POST",
	data: {
		"name": name,
		"phone": phone,
		"birth": birth,
        "type":type
        },
        dataType: "html",
        success: function(data) {
            if (type == 'form') {
                $("body").append(data);
                $("#name").focus();
            } else if (type == 'chk') {
                $('#rv_list').html(data);
            }
        }
	});
	return false;
}

function user_cancel(link,id){
    if (confirm('정말로 예약취소 하시겠습니까?\n취소하면 되돌릴 수 없습니다.')) {
        $.ajax({
            url: link+"/ajax/rv_check.ajax.php",
            type: "POST",
            data: {
                "type": 'cancel',
                "id": id,
                "bo_table": g5_bo_table
            },
            dataType: "html",
            success: function(data) {
                if (data == 'no') {
                    alert('잘못된 접근입니다.');
                    location.reload();
                } else {
                    location.href = '/bbs/delete.php?bo_table='+g5_bo_table+'&wr_id='+id+'&token='+data;
                }
            }
        });
    }
}

function clinic_ck(link,id,type){
    if (!type) {
        type = '완료';
    } else {
        type = '취소';
    }
    if (confirm('진료를 '+type+'하시겠습니까?')) {
        $.ajax({
            url: link+"/ajax/clinic_ck.ajax.php",
            type: "POST",
            data: {
                "wr_id": id,
                "type": type,
                "bo_table": g5_bo_table
            },
            dataType: "html",
            success: function(data) {
                alert(data);
                location.reload();
            }
        });
    }
}

function Num_ck(obj){ 
    var val = obj.value; 
    if (isNaN(val)) { 
        alert("숫자만 입력해 주세요"); 
        obj.value = val.replace(/[^0-9]/gi, ''); 
    }  
}

function check_day() {
    var sh_checktime = $('select[name=sh_checktime]').val();
    if (!sh_checktime) {
        alert('예약 시간을 먼저 선택해주시기 바랍니다.');
    }
}

function korean_ck(obj) {
    var val = obj.value;
    var korean = /^[가-힣ㄱ-ㅎㅏ-ㅣㆍ ᆢ\s]*$/;
    if (!korean.test(val)) {
        alert("한글만 입력해 주세요");
        obj.value = val.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣㆍ ᆢ\s]+/g, '');
    }
}

function checkAll(){
    if ($("#ckall").is(':checked')) {
        $("input.prv_ck").prop("checked",true);
    } else {
        $("input.prv_ck").prop("checked",false);
    }
}

function sh_birth_input(obj){
	var value = $(obj).val();
	var RegNotNum = /[^0-9]/g;
	
	value = value.replace(RegNotNum, '');

    if (value.length > 8) {
        value = value.slice(0, 8);
    }
    
    // 날짜 포맷(yyyy-mm-dd) 만들기 
    if (value.length > 6) {
        value = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    } else if (value.length > 4) {
        value = `${value.slice(0, 4)}-${value.slice(4, 6)}`;
    } else if (value.length > 2) {
        value = `${value.slice(0, 4)}`;
    }
    $(obj).val(value);
}

function sh_time_input(obj){
	var value = $(obj).val();
	var RegNotNum = /[^0-9]/g;
	
	value = value.replace(RegNotNum, '');

    // 시간 포맷(hh:mm) 만들기
    if (value.length >= 2) {
        value = `${value.slice(0, 2)}:${value.slice(2, 4)}`;
    }
    $(obj).val(value);
}

function view_submit(f){
    var birth = f.sh_birth.value;
    var birth_arr = birth.split('-');
    var last = new Date(birth_arr[0], birth_arr[1], 0); 
    var today = new Date();
    var year = today.getFullYear();
    var lastday = last.getDate();

    //년도체크
    if (birth_arr[0]>year) {
        alert('년도를 정확히 입력해주시기바랍니다.');
        return false;
    }
    
    //생년월일 체크
    if (birth_arr[1] == '00' || birth_arr[1] > 12) {
        alert('달을 정확히 입력해주시기바랍니다.');
        return false;
    }
    if (birth_arr[2] == '00' || birth_arr[2] > lastday) {
        alert('일을 정확히 입력해주시기바랍니다.');
        return false;
    }

	if ($("#pvc_agree").is(":checked") != true) {
		alert("이용약관에 동의 해주세요.");
		$("#pvc_agree").focus();
		return false;
	}
	if ($("#pvc_agree2").is(":checked") != true) {
		alert("개인정보취급방침에 동의 해주세요.");
		$("#pvc_agree2").focus();
		return false;
	}
}

function select_delete(link){
    var f = document.fboardlist;
    str = "취소";
    if (!check_confirm(str)) return;
    if (!confirm("선택한 예약내역을 정말로 "+str+"하시겠습니까?")) return;
    f.action = link+"/delete_all.head.skin.php";
    f.submit();
}
