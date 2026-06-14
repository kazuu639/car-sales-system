'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function PrintPage() {
  const searchParams = useSearchParams()
  const form = JSON.parse(decodeURIComponent(searchParams.get('data') || '{}'))

  useEffect(() => {
    setTimeout(() => window.print(), 800)
  }, [])

  return (
    <html>
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: serif; background: white; }
          @page { size: A4 portrait; margin: 15mm 12mm; }
          @media print { body { margin: 0; } }
          table { border-collapse: collapse; width: 100%; }
          .section-header { background: #f0f0f0; padding: 3px 8px; font-weight: bold; border-bottom: 1px solid #333; font-size: 11px; }
          .cell { padding: 4px 8px; font-size: 10px; border: 0.5px solid #ccc; }
          .label { color: #555; }
        `}</style>
      </head>
      <body style={{ padding: '0', fontFamily: 'serif', fontSize: '10px', lineHeight: '1.5' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '10px' }}>（弊社控え）</div>
          <div style={{ fontSize: '10px', textAlign: 'right' }}>契約No.<br/>査定No.</div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', letterSpacing: '12px', marginBottom: '6px' }}>売　買　契　約　書</div>
        <div style={{ fontSize: '10px', marginBottom: '8px' }}>売主と買主は、この契約書表面の記載及び状態に従って、ここに自動車の売買契約を締結します。</div>

        {/* 売主・買主 */}
        <table style={{ marginBottom: '4px', border: '1px solid #333' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333' }}>
                <div className="section-header">・売主</div>
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '10px', marginBottom: '4px' }}>
                    <span><span className="label">フリガナ：</span>{form.seller_name_kana}</span>
                    <span><span className="label">生年月日：</span>{form.seller_birthday}</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>氏名：{form.seller_name}</div>
                  <div style={{ fontSize: '10px' }}><span className="label">運転免許証番号：</span>{form.seller_license_number}</div>
                  <div style={{ fontSize: '10px' }}><span className="label">住所：</span>{form.seller_address}</div>
                  <div style={{ fontSize: '10px' }}><span className="label">電話：</span>{form.seller_phone}</div>
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333' }}>
                <div className="section-header">・買主の商号及び所在地</div>
                <div style={{ padding: '6px 8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>{form.company_name || '　'}</div>
                  <div style={{ fontSize: '10px' }}>{form.company_address || '　'}</div>
                  <div style={{ fontSize: '10px' }}>TEL {form.company_tel || '　'} FAX {form.company_fax || '　'}</div>
                  <div style={{ fontSize: '10px' }}>担当者：{form.assigned_to || '　'}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'right', fontSize: '10px', marginBottom: '4px' }}>契約日：{form.contract_date}</div>

        {/* 契約車両 */}
        <table style={{ marginBottom: '4px', border: '1px solid #333' }}>
          <tbody>
            <tr><td colSpan={4} className="section-header">・契約車両の表示および明細</td></tr>
            <tr>
              <td colSpan={2} className="cell"><span className="label">所有者名：</span>{form.owner_name}　<span className="label">住所：</span>{form.owner_address}</td>
              <td colSpan={2} className="cell"><span className="label">使用者名：</span>{form.user_same_as_owner ? '同上' : form.user_name}　<span className="label">住所：</span>{form.user_same_as_owner ? '同上' : form.user_address}</td>
            </tr>
            <tr>
              <td className="cell"><span className="label">登録番号：</span>{form.registration_number}</td>
              <td className="cell"><span className="label">初年度登録：</span>{form.first_registration}年{form.first_registration_month}月</td>
              <td colSpan={2} className="cell"><span className="label">登録年月日：</span>{form.registration_date}</td>
            </tr>
            <tr>
              <td className="cell"><span className="label">車名：</span>{form.car_name}</td>
              <td className="cell"><span className="label">グレード：</span>{form.grade}</td>
              <td className="cell"><span className="label">ターボ：</span>{form.turbo ? '有' : '無'}</td>
              <td className="cell"><span className="label">駆動：</span>{form.drive}</td>
            </tr>
            <tr>
              <td className="cell"><span className="label">型式：</span>{form.model_type}</td>
              <td className="cell"><span className="label">色：</span>{form.color}</td>
              <td className="cell"><span className="label">排気量：</span>{form.displacement}cc</td>
              <td className="cell"><span className="label">燃料：</span>{form.fuel}　<span className="label">ハンドル：</span>{form.handle}</td>
            </tr>
            <tr>
              <td className="cell"><span className="label">車台番号：</span>{form.chassis_number}</td>
              <td className="cell"><span className="label">車歴：</span>{form.vehicle_history}</td>
              <td colSpan={2} className="cell"><span className="label">車検有効期限：</span>{form.inspection_expiry}</td>
            </tr>
            <tr>
              <td colSpan={2} className="cell"><span className="label">メーター表示値：</span>{form.mileage ? Number(form.mileage).toLocaleString() : ''}km　<span className="label">メーター交換：</span>{form.meter_exchange ? '有' : '無'}</td>
              <td colSpan={2} className="cell"><span className="label">ミッション：</span>{form.mission}{form.mission_speed ? `（${form.mission_speed}速）` : ''}　<span className="label">輸入車：</span>{form.import_car ? '有' : '無'}</td>
            </tr>
            <tr>
              <td className="cell"><span className="label">新車時保証書：</span>{form.has_warranty_book ? '有' : '無'}</td>
              <td className="cell"><span className="label">取扱説明書：</span>{form.has_manual ? '有' : '無'}</td>
              <td colSpan={2} className="cell"><span className="label">整備記録：</span>{form.has_service_record ? '有' : '無'}</td>
            </tr>
            <tr>
              <td className="cell"><span className="label">修復歴：</span>{form.repair_history ? '有' : '無'}</td>
              <td className="cell"><span className="label">災害歴：</span>{form.disaster_history ? '有' : '無'}</td>
              <td className="cell"><span className="label">改造歴：</span>{form.modification_history ? '有' : '無'}</td>
              <td className="cell"><span className="label">抵当権：</span>{form.lien ? '有' : '無'}</td>
            </tr>
            <tr>
              <td className="cell"><span className="label">自動車税：</span>{form.car_tax}</td>
              <td className="cell"><span className="label">リサイクル預託金：</span>{form.recycle_deposited ? '預託済' : '未預託'}{form.recycle_fee ? `（¥${Number(form.recycle_fee).toLocaleString()}）` : ''}</td>
              <td colSpan={2} className="cell"><span className="label">ローン残債：</span>{form.loan_debt ? `有（${form.loan_debt_amount}円）` : '無'}</td>
            </tr>
            {form.defect_detail && (
              <tr><td colSpan={4} className="cell"><span className="label">不具合箇所：</span>{form.defect_detail}</td></tr>
            )}
            <tr>
              <td className="cell"><span className="label">紹介者：</span>{form.introducer ? `有（${form.introducer_name}）` : '無'}</td>
              <td className="cell"><span className="label">売主と所有者の相違理由：</span>{form.owner_discrepancy_reason}</td>
              <td colSpan={2} className="cell"><span className="label">売主と口座名義の相違理由：</span>{form.account_discrepancy_reason}</td>
            </tr>
          </tbody>
        </table>

        {/* 車両契約金額 */}
        <table style={{ marginBottom: '4px', border: '1px solid #333' }}>
          <tbody>
            <tr><td className="section-header">・車両契約金額</td></tr>
            <tr><td style={{ padding: '8px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', letterSpacing: '4px' }}>¥ {form.contract_amount ? Number(form.contract_amount).toLocaleString() : '　　　　　　'} －</td></tr>
            <tr><td style={{ padding: '4px 8px', fontSize: '9px', color: '#444', borderTop: '0.5px solid #ccc' }}>
              ※上記車両契約金額は、以下のものを含みます。自動車損害賠償責任保険の未経過分保険料相当額（自動車損害賠償責任保険料は次回車検満了日の翌日までの期間分の完納を前提とします）車両本体価格に関わる消費税　重量税　未経過自動車税　なお、支払代金に関しましては、契約自動車の自動車未納金額およびローン残債、契約車両を担保とする借入金額等がある場合は、これらの金額を差し引きます。
            </td></tr>
          </tbody>
        </table>

        {/* 特記事項・支払方法 */}
        <table style={{ marginBottom: '4px', border: '1px solid #333' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333' }}>
                <div className="section-header">・特記事項</div>
                <div style={{ padding: '6px 8px', minHeight: '50px', fontSize: '10px' }}>{form.notes || '　'}</div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333' }}>
                <div className="section-header">・お支払方法</div>
                <div style={{ padding: '6px 8px', fontSize: '10px' }}>
                  <div><span className="label">支払方法：</span>{form.payment_method}</div>
                  <div><span className="label">口座名義：</span>{form.bank_account_name}</div>
                  <div><span className="label">金融機関名：</span>{form.bank_name}　<span className="label">支店名：</span>{form.bank_branch}</div>
                  <div><span className="label">{form.bank_account_type}　口座番号：</span>{form.bank_account_number}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 車両引渡時期 */}
        <table style={{ marginBottom: '4px', border: '1px solid #333' }}>
          <tbody>
            <tr><td colSpan={3} className="section-header">・車両引渡時期および譲渡書類引渡期限</td></tr>
            <tr>
              <td className="cell"><span className="label">契約車両引渡日：</span>　　年　　月　　日</td>
              <td className="cell"><span className="label">譲渡書類引渡期日：</span>　　年　　月　　日</td>
              <td className="cell"><span className="label">引渡場所：</span>　　　　　　</td>
            </tr>
          </tbody>
        </table>

        {/* 売主確認事項 */}
        <table style={{ marginBottom: '4px', border: '1px solid #333' }}>
          <tbody>
            <tr><td className="section-header">・本契約についての売主の確認</td></tr>
            <tr><td style={{ padding: '4px 8px', fontSize: '9px' }}>
              {['上記に表示の契約車両の詳細及び状態に相違ありません。これらの内容に相違があった場合、契約解除・代金返還・損害賠償等の請求を受けても異議ありません。',
                '裏面記載の車両売買約款を確認し、承諾いたしました。',
                '契約車両は私の認識の有無にかかわらず、走行距離・修復歴・災害車両等の相違があると判明したとき、または後に係争等が明らかとなった場合、何らの催告なしに本契約を解除されても異議ありません。',
                '駐車場反則・放置違反等の未納金はありません。',
                '売主が所有者と異なる場合、売却について所有者より委託を受け、または所有者の委任を得ていることを保証します。',
                '売主が所有者と異なる場合、売却について所有者より委託され、または所有者の委任を得ていることを保証します。',
                '私に不利な内容を含め、本契約に関する説明を受けたうえに全条項について異議なく承諾いたしました。'
              ].map((t, i) => <div key={i}>{i+1}. {t}</div>)}
            </td></tr>
          </tbody>
        </table>

        {/* 署名欄 */}
        <table style={{ border: '1px solid #333' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '8px', minHeight: '60px', border: '1px solid #333', verticalAlign: 'top' }}>
                <div style={{ fontSize: '10px', color: '#555' }}>売主署名</div>
                <div style={{ marginTop: '30px', borderBottom: '1px solid #333' }}></div>
              </td>
              <td style={{ width: '50%', padding: '8px', border: '1px solid #333', verticalAlign: 'top' }}>
                <div style={{ fontSize: '10px', color: '#555' }}>買主（弊社）</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '8px' }}>{form.company_name || '　'}</div>
              </td>
            </tr>
          </tbody>
        </table>

      </body>
    </html>
  )
}
