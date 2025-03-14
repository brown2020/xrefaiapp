"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import SummarizeTopic from "./SummarizeTopic";
import FreestylePrompt from "./FreestylePrompt";
import SimplifyPrompt from "./SimplifyPrompt";
import DesignerPrompt from "./DesignerPrompt";
import ImagePrompt from "./ImagePrompt";

export default function Tools() {
  const [selectedTool, setSelectedTool] = useState<string>("Summarize Writing");

  const toolList = [
    {
      title: "Summarize Writing",
      svg: (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.19589 11.9984C3.19589 14.6718 3.19749 17.3448 3.19483 20.0182C3.1943 20.675 3.40085 21.232 3.93076 21.6456C4.29554 21.9303 4.7166 22.0359 5.17165 22.0354C6.1635 22.0343 7.15483 22.0264 8.14669 22.0386C8.89111 22.0476 9.33076 22.8048 8.96651 23.4292C8.80881 23.6995 8.56881 23.881 8.25926 23.8816C7.012 23.8826 5.75731 23.9395 4.51855 23.8295C2.88103 23.6841 1.55731 22.2749 1.37306 20.6405C1.33377 20.2901 1.31306 19.9354 1.31306 19.5823C1.30935 14.3952 1.29926 9.20813 1.31731 4.02105C1.32262 2.40105 2.03041 1.16282 3.52297 0.437507C4.04067 0.185826 4.59766 0.0998081 5.17271 0.101401C6.9435 0.105118 8.7143 0.102994 10.4851 0.102994C12.4598 0.102994 14.4339 0.0998081 16.4086 0.104056C18.3467 0.108304 19.8515 1.38689 20.1637 3.29202C20.1966 3.49167 20.203 3.69768 20.2035 3.90052C20.2067 5.74193 20.2067 7.58282 20.2046 9.42423C20.204 9.95149 19.972 10.2908 19.5393 10.4209C19.0046 10.5812 18.4561 10.2414 18.3695 9.69131C18.3504 9.56972 18.3462 9.44494 18.3462 9.32122C18.3446 7.53291 18.3472 5.74512 18.3446 3.9568C18.343 2.98246 17.8539 2.28954 16.981 2.04211C16.7718 1.98264 16.5446 1.96459 16.3258 1.96406C12.6249 1.95928 8.92404 1.96034 5.22262 1.9614C3.97589 1.95981 3.19749 2.73344 3.19643 3.97857C3.1943 6.65202 3.19589 9.32494 3.19589 11.9984Z"
              fill="#83A873"
            />
            <path
              d="M22.6863 15.4736C22.6412 16.3147 22.3624 16.9991 21.7927 17.563C20.5921 18.7518 19.3996 19.9487 18.2033 21.1423C17.7647 21.5798 17.3394 22.0311 16.8822 22.4479C16.6868 22.6258 16.441 22.7846 16.1904 22.8589C15.0472 23.1977 13.8928 23.4993 12.7449 23.8221C12.3509 23.9325 11.9888 23.9187 11.6893 23.6087C11.3919 23.3007 11.3803 22.9386 11.5013 22.5467C11.8507 21.4168 12.1836 20.281 12.5426 19.1543C12.6095 18.9441 12.7353 18.7301 12.8904 18.574C14.5417 16.9099 16.201 15.2538 17.8645 13.6025C18.6599 12.8129 19.6167 12.5469 20.6898 12.8697C21.7093 13.1761 22.3422 13.8876 22.5971 14.9235C22.6459 15.12 22.6629 15.3244 22.6863 15.4736ZM13.7288 21.6191C14.3256 21.4529 14.8709 21.3079 15.4109 21.146C15.5394 21.1078 15.6716 21.0345 15.7666 20.941C16.5668 20.1536 17.359 19.3571 18.1534 18.5644C18.4459 18.2724 18.7396 17.9814 19.0151 17.7074C18.5707 17.2593 18.1438 16.8287 17.71 16.3917C17.6935 16.4055 17.6654 16.4251 17.6415 16.449C16.5583 17.529 15.4751 18.609 14.393 19.6901C14.3442 19.7389 14.2911 19.7952 14.2714 19.8584C14.0914 20.4287 13.9183 21.001 13.7288 21.6191ZM20.3712 16.3444C21.0084 15.8294 20.8496 15.1582 20.5093 14.8481C20.075 14.4525 19.4813 14.5343 19.073 15.0462C19.5026 15.4757 19.9311 15.9042 20.3712 16.3444Z"
              fill="#83A873"
            />
            <path
              d="M10.7813 5.67663C12.3562 5.67663 13.9316 5.67185 15.5064 5.67875C16.2827 5.68247 16.7362 6.45185 16.3459 7.08796C16.1537 7.40123 15.8601 7.53663 15.4964 7.53557C14.6468 7.53397 13.7972 7.53504 12.9482 7.53504C10.6565 7.53504 8.36485 7.53663 6.07317 7.53397C5.36963 7.53344 4.9183 6.98389 5.09193 6.35203C5.20715 5.93362 5.56503 5.67769 6.05671 5.67716C7.63105 5.67504 9.20645 5.67663 10.7813 5.67663Z"
              fill="#83A873"
            />
            <path
              d="M10.7544 11.2534C9.18799 11.2534 7.62215 11.2561 6.05578 11.2524C5.37985 11.2508 4.93755 10.7214 5.08356 10.1055C5.17383 9.72477 5.49082 9.44654 5.88799 9.40193C5.95808 9.39397 6.02923 9.39503 6.09985 9.39503C9.21454 9.3945 12.3292 9.39397 15.4439 9.39556C16.0609 9.39556 16.4804 9.77255 16.483 10.32C16.4857 10.8499 16.0752 11.2492 15.5055 11.2518C14.382 11.2572 13.2579 11.2534 12.1344 11.2534C11.6745 11.2534 11.2147 11.2534 10.7544 11.2534Z"
              fill="#83A873"
            />
            <path
              d="M8.89176 13.1124C9.84698 13.1124 10.8022 13.1065 11.7574 13.1145C12.4185 13.1204 12.856 13.6827 12.6903 14.2927C12.5788 14.7053 12.2114 14.9692 11.7266 14.9697C10.3381 14.9724 8.94963 14.9708 7.56114 14.9708C7.05724 14.9708 6.55282 14.974 6.04892 14.9697C5.47388 14.965 5.06131 14.5816 5.05335 14.0522C5.04485 13.5165 5.46645 13.115 6.05317 13.1129C6.99937 13.1092 7.94556 13.1124 8.89176 13.1124Z"
              fill="#83A873"
            />
          </svg>
        </>
      ),
    },
    {
      title: "Freestyle Writing",
      svg: (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.42352 4.67204C7.42352 4.3524 7.42033 4.07045 7.42405 3.78797C7.43148 3.23151 7.80423 2.85558 8.35697 2.84762C8.64741 2.84337 8.93839 2.84709 9.22458 2.84709C9.51555 1.10815 10.484 0.128504 11.9203 0.100893C13.4442 0.0711586 14.3973 0.983371 14.7748 2.84709C15.0616 2.84709 15.352 2.84337 15.643 2.84815C16.1793 2.85665 16.5589 3.23364 16.5695 3.76886C16.5754 4.0593 16.5706 4.34974 16.5706 4.67204C17.1594 4.67204 17.7318 4.65346 18.3021 4.67895C18.6425 4.69434 18.9966 4.73045 19.3147 4.84196C20.2412 5.16638 20.8285 5.83222 21.0658 6.78373C21.1412 7.08691 21.1779 7.40709 21.1784 7.71983C21.1853 12.146 21.1895 16.5722 21.18 20.9984C21.1763 22.7671 19.8117 23.9119 18.2862 23.9023C14.0915 23.8774 9.89626 23.8943 5.70104 23.8933C4.27697 23.8927 3.23361 23.0735 2.90706 21.6908C2.84918 21.446 2.81467 21.1896 2.81414 20.9384C2.80883 16.4857 2.80564 12.0329 2.81255 7.58018C2.8152 5.79611 4.1883 4.61788 5.72493 4.66833C6.28086 4.68744 6.83785 4.67204 7.42352 4.67204ZM16.5706 6.51293C16.5706 6.82036 16.5727 7.09381 16.5701 7.36726C16.5637 7.95452 16.1915 8.33311 15.6069 8.33364C13.2 8.33629 10.7925 8.33629 8.38564 8.33364C7.80423 8.33311 7.42883 7.95027 7.42352 7.3662C7.42086 7.08532 7.42299 6.80496 7.42299 6.50868C6.85432 6.50868 6.31538 6.50868 5.77644 6.50868C5.0129 6.50921 4.67414 6.84532 4.67414 7.60408C4.67414 12.0563 4.67414 16.509 4.67414 20.9612C4.67414 21.7205 5.01821 22.0678 5.77166 22.0678C9.92228 22.0683 14.0724 22.0683 18.223 22.0678C18.9775 22.0678 19.32 21.7221 19.32 20.9607C19.32 16.5085 19.32 12.0558 19.32 7.60355C19.32 7.51487 19.3237 7.4262 19.3152 7.33806C19.2743 6.91063 18.9297 6.53417 18.5081 6.51877C17.8725 6.49594 17.2359 6.51293 16.5706 6.51293ZM14.7329 4.68372C12.9048 4.68372 11.0899 4.68372 9.27024 4.68372C9.27024 5.29753 9.27024 5.89912 9.27024 6.49647C11.1021 6.49647 12.9106 6.49647 14.7329 6.49647C14.7329 5.88744 14.7329 5.29169 14.7329 4.68372ZM11.1042 2.83434C11.7 2.83434 12.2963 2.83434 12.8931 2.83434C12.8941 2.3193 12.4832 1.91895 11.9814 1.92479C11.5285 1.9301 11.0533 2.3416 11.1042 2.83434Z"
              fill="#D0302F"
            />
            <path
              d="M11.9872 15.6589C10.775 15.6589 9.56229 15.6653 8.35008 15.6563C7.63273 15.651 7.19574 14.914 7.53716 14.3018C7.71131 13.9896 7.98795 13.8271 8.34264 13.8265C10.7761 13.8228 13.2101 13.8212 15.6435 13.8271C16.1798 13.8281 16.5743 14.2391 16.5701 14.752C16.5658 15.2634 16.1644 15.6547 15.6244 15.6568C14.4122 15.6621 13.2 15.6589 11.9872 15.6589Z"
              fill="#D0302F"
            />
            <path
              d="M11.9697 11.9968C10.7931 11.9968 9.61646 11.9979 8.43929 11.9963C7.83558 11.9958 7.42354 11.6219 7.42407 11.0809C7.4246 10.5361 7.8308 10.1687 8.44036 10.1687C10.8117 10.1676 13.183 10.1676 15.5538 10.1687C16.1602 10.1692 16.5701 10.5404 16.5696 11.0825C16.569 11.6235 16.157 11.9952 15.5527 11.9958C14.3586 11.9973 13.1644 11.9968 11.9697 11.9968Z"
              fill="#D0302F"
            />
            <path
              d="M9.23576 19.3211C8.93522 19.3211 8.63469 19.3275 8.33416 19.3195C7.81753 19.3062 7.42514 18.9085 7.42407 18.4073C7.42301 17.9029 7.80691 17.4988 8.32673 17.4882C8.94531 17.4754 9.5639 17.4754 10.1825 17.4887C10.6938 17.4998 11.0899 17.9204 11.0841 18.4136C11.0782 18.9085 10.6768 19.3078 10.1634 19.3195C9.85434 19.3269 9.54478 19.3211 9.23576 19.3211Z"
              fill="#D0302F"
            />
          </svg>
        </>
      ),
    },
    {
      title: "Simplify Writing",
      svg: (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_122_121)">
              <path
                d="M11.3963 2.69416C12.3754 1.74 13.5361 1.37097 14.8662 1.40283C16.2366 1.43628 17.6092 1.41504 18.9802 1.40283C19.1182 1.40177 19.277 1.32212 19.389 1.23292C19.706 0.980177 19.9742 0.657345 20.314 0.444956C21.3043 -0.173629 22.6004 0.0722121 23.3538 0.980177C24.0945 1.87274 24.0664 3.20708 23.2896 4.07469C23.2837 4.08106 23.2784 4.08903 23.271 4.09381C22.705 4.47451 22.6572 5.02566 22.6593 5.65805C22.68 10.9784 22.671 16.2982 22.671 21.6186C22.671 22.2648 22.4209 22.5149 21.7726 22.5149C19.1448 22.5149 16.517 22.517 13.8887 22.5112C13.6965 22.5106 13.5807 22.5547 13.466 22.7304C12.4381 24.3069 10.1262 24.2867 9.12001 22.6943C9.02337 22.5414 8.92036 22.5074 8.75894 22.5069C6.14921 22.4958 3.53894 22.4809 0.92921 22.466C0.36744 22.4634 0.106201 22.2005 0.106201 21.6356C0.106201 15.1736 0.106201 8.71115 0.106201 2.2492C0.106201 1.6646 0.360006 1.4108 0.946201 1.4108C3.28195 1.41027 5.61824 1.4315 7.95399 1.4023C9.27558 1.38531 10.4257 1.74903 11.3963 2.69416ZM11.3942 19.0731C12.1306 18.5273 12.9414 18.3196 13.8271 18.3234C16.2074 18.3329 18.5878 18.3265 20.9687 18.3265C21.0637 18.3265 21.1588 18.3265 21.2634 18.3265C21.2634 14.2561 21.2634 10.2096 21.2634 6.12637C21.18 6.20283 21.1211 6.25274 21.0669 6.30743C18.3011 9.07434 15.5374 11.8428 12.7657 14.6039C12.6085 14.7605 12.4051 14.8912 12.1997 14.9756C11.2927 15.3473 10.3651 15.6706 9.46779 16.063C8.76532 16.3704 8.06071 16.5106 7.29027 16.483C6.07965 16.4395 4.86585 16.4729 3.65363 16.4708C3.21186 16.4703 2.90549 16.1883 2.89965 15.7874C2.89381 15.3786 3.20762 15.0865 3.66054 15.0818C3.72266 15.0812 3.78425 15.0818 3.84638 15.0818C5.06762 15.0818 6.28886 15.0834 7.5101 15.0786C7.59611 15.0781 7.73682 15.0579 7.75912 15.0064C7.94602 14.5758 8.11116 14.1361 8.28691 13.6896C6.72107 13.6896 5.19186 13.6901 3.66213 13.688C3.56602 13.688 3.46514 13.6763 3.3754 13.645C3.10089 13.5488 2.93576 13.3519 2.90549 13.0604C2.87523 12.7678 2.9931 12.5288 3.24903 12.3956C3.3908 12.3223 3.56974 12.2936 3.73222 12.2931C5.0862 12.2851 6.44018 12.292 7.79417 12.2862C8.13452 12.2846 8.46532 12.2857 8.69895 12.634C8.78284 12.4237 8.86036 12.265 8.9108 12.0972C9.0393 11.6708 9.28886 11.3368 9.60425 11.023C12.2899 8.35115 14.9644 5.66814 17.6416 2.98832C17.692 2.93788 17.7372 2.88159 17.8041 2.80673C16.6752 2.80673 15.5867 2.79345 14.4988 2.81044C13.4151 2.82796 12.5517 3.25221 12.0101 4.23717C11.7303 4.74584 11.0602 4.75327 10.7846 4.24673C10.2409 3.24743 9.36956 2.81788 8.27523 2.81097C6.10726 2.79664 3.9393 2.80673 1.7708 2.80673C1.68479 2.80673 1.5993 2.80673 1.50479 2.80673C1.50479 7.98956 1.50479 13.1464 1.50479 18.3271C1.61151 18.3271 1.70656 18.3271 1.8016 18.3271C4.18195 18.3271 6.56231 18.3335 8.94319 18.3239C9.83947 18.3196 10.6604 18.523 11.3942 19.0731ZM1.50213 21.0786C1.61363 21.0786 1.70071 21.0781 1.78779 21.0786C4.28231 21.0897 6.77735 21.1009 9.27186 21.1126C9.8347 21.1152 9.98018 21.2156 10.1846 21.7333C10.3715 22.2069 10.8212 22.5175 11.3135 22.5127C11.7998 22.508 12.2384 22.2037 12.4237 21.7428C12.642 21.1996 12.7657 21.1163 13.3551 21.1163C15.8942 21.1163 18.4333 21.1163 20.9724 21.1163C21.0728 21.1163 21.1736 21.1163 21.2607 21.1163C21.2607 20.623 21.2607 20.1759 21.2607 19.7347C21.2241 19.7262 21.2071 19.7188 21.1901 19.7188C18.651 19.7188 16.1119 19.7108 13.5727 19.7251C12.9207 19.7288 12.3531 19.9736 11.9214 20.4956C11.6506 20.8227 11.1637 20.8428 10.894 20.5211C10.3827 19.9115 9.72001 19.7145 8.96018 19.7156C6.57133 19.7193 4.18248 19.7172 1.79417 19.7172C1.70018 19.7172 1.60567 19.7172 1.50266 19.7172C1.50213 20.1796 1.50213 20.6108 1.50213 21.0786ZM12.1269 13.2446C14.8938 10.4766 17.6506 7.71876 20.3931 4.97575C19.9423 4.51965 19.4846 4.05664 19.0519 3.61912C16.2951 6.3754 13.5335 9.13646 10.774 11.8954C11.2184 12.3382 11.6751 12.7933 12.1269 13.2446ZM21.4412 3.9754C21.6881 3.72478 21.9292 3.47947 22.1703 3.23416C22.2011 3.20283 22.2313 3.17044 22.2595 3.13646C22.5951 2.72973 22.5828 2.17965 22.2303 1.81062C21.8761 1.43947 21.3005 1.37841 20.9129 1.71239C20.6028 1.97947 20.3347 2.29434 20.0512 2.58478C20.5073 3.04088 20.9618 3.49593 21.4412 3.9754ZM9.99824 13.1464C9.81717 13.6057 9.64248 14.0485 9.43859 14.5657C9.95151 14.3665 10.4039 14.1908 10.8462 14.0188C10.5616 13.7257 10.2881 13.4448 9.99824 13.1464Z"
                fill="#E26F20"
              />
              <path
                d="M5.82946 8.11169C5.12167 8.11169 4.41335 8.11275 3.70557 8.11116C3.22238 8.11009 2.90486 7.83717 2.89902 7.42195C2.89265 6.99877 3.21707 6.70992 3.71247 6.70939C5.13707 6.70726 6.56167 6.70726 7.98628 6.70939C8.46256 6.70992 8.7907 6.99505 8.79813 7.40231C8.80557 7.82018 8.47318 8.11009 7.9799 8.11116C7.26256 8.11275 6.54574 8.11169 5.82946 8.11169Z"
                fill="#E26F20"
              />
              <path
                d="M5.82535 10.8956C5.10907 10.8956 4.39226 10.8972 3.67597 10.895C3.2119 10.8934 2.90341 10.6168 2.89969 10.2069C2.89597 9.79805 3.20872 9.50495 3.66376 9.50442C5.11438 9.50177 6.565 9.5023 8.01509 9.50442C8.47013 9.50495 8.7919 9.7938 8.79615 10.1947C8.8004 10.6046 8.47438 10.894 8.00075 10.895C7.27544 10.8966 6.55066 10.8956 5.82535 10.8956Z"
                fill="#E26F20"
              />
            </g>
            <defs>
              <clipPath id="clip0_122_121">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </>
      ),
    },
    {
      title: "Generate Image",
      svg: (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_122_126)">
              <path
                d="M23.8387 11.9936C23.8387 13.834 23.8546 15.6743 23.8291 17.5147C23.8211 18.0674 23.7277 18.6244 23.6199 19.1692C23.3783 20.3915 22.7082 21.3759 21.8114 22.2111C20.913 23.048 19.858 23.6039 18.6298 23.7181C17.4866 23.8242 16.3355 23.8731 15.187 23.8842C12.7716 23.9076 10.3551 23.8975 7.93919 23.8842C6.82521 23.8779 5.70857 23.8604 4.61902 23.5726C2.39158 22.9848 0.567158 20.9352 0.279902 18.6398C0.176893 17.8168 0.125919 16.9821 0.120079 16.1527C0.100964 13.3832 0.105211 10.6131 0.116893 7.84301C0.121672 6.75504 0.143972 5.66389 0.429636 4.60248C1.02911 2.37717 3.0638 0.554335 5.35017 0.286193C6.48008 0.15345 7.62645 0.12637 8.76592 0.115751C11.2079 0.0923882 13.6509 0.104601 16.0934 0.11522C17.1197 0.119468 18.1472 0.143362 19.1555 0.369556C21.5003 0.895751 23.4229 2.97664 23.7203 5.36549C23.8291 6.24106 23.8641 7.12885 23.8817 8.01186C23.9077 9.33876 23.8886 10.6667 23.8886 11.9942C23.8716 11.9936 23.8551 11.9936 23.8387 11.9936ZM1.93866 16.3816C1.97052 16.3981 2.00238 16.414 2.03424 16.4304C2.09211 16.3529 2.14149 16.2669 2.20893 16.1995C3.29583 15.1088 4.38008 14.0156 5.47707 12.9345C5.91778 12.5002 6.37229 12.0781 6.84751 11.6825C7.40663 11.2173 8.07725 11.0368 8.79884 11.0442C9.78804 11.0549 10.5967 11.4642 11.2413 12.1975C11.8312 12.8687 12.4047 13.5542 12.9803 14.2375C13.5266 14.8864 14.0666 15.5405 14.6581 16.251C14.7293 16.1522 14.7749 16.0619 14.844 15.9966C15.2103 15.6504 15.564 15.2878 15.9564 14.9734C17.2769 13.9163 19.0902 14.0204 20.2572 15.2485C20.8222 15.8432 21.3112 16.5101 21.8353 17.1441C21.881 17.1998 21.9309 17.2519 22.0302 17.3623C22.0302 17.2009 22.0302 17.1154 22.0302 17.0299C22.0403 14.1361 22.0599 11.2428 22.0541 8.34903C22.0525 7.49203 22.0042 6.63292 21.933 5.77858C21.7652 3.76513 20.0077 2.34106 18.6665 2.13982C18.0728 2.05062 17.4712 1.97522 16.8728 1.96938C14.1208 1.94336 11.3688 1.93327 8.61725 1.94177C7.67158 1.94495 6.72433 1.98956 5.78185 2.06602C3.77636 2.22849 2.34857 3.97699 2.14096 5.32991C2.04857 5.9315 1.97424 6.54265 1.96893 7.15009C1.94397 9.97274 1.9461 12.7959 1.93866 15.6186C1.93813 15.8734 1.93866 16.1278 1.93866 16.3816ZM17.1962 22.0582C17.0889 21.9223 17.0385 21.8543 16.9843 21.7901C14.9693 19.4065 12.9553 17.0214 10.9365 14.6411C10.5367 14.1696 10.139 13.6922 9.70043 13.2579C9.18645 12.7487 8.46857 12.7386 7.893 13.1809C7.75282 13.2887 7.61424 13.4007 7.48946 13.525C5.75265 15.2522 4.01636 16.9805 2.28857 18.7168C2.22486 18.7811 2.20096 18.9457 2.23388 19.0359C2.74999 20.4589 3.71052 21.4418 5.19088 21.8166C5.80946 21.9733 6.46787 22.0216 7.10928 22.028C10.0535 22.0561 12.9988 22.0519 15.9431 22.0588C16.3371 22.0593 16.7305 22.0582 17.1962 22.0582ZM15.7955 17.5996C16.9541 18.9478 18.0749 20.2471 19.1873 21.5538C19.2994 21.685 19.3859 21.6552 19.5033 21.5963C20.3066 21.1933 20.9411 20.6087 21.4132 19.843C21.487 19.723 21.4758 19.6476 21.3903 19.5441C21.1657 19.2706 20.9576 18.9839 20.7351 18.7088C20.1341 17.9671 19.5526 17.2073 18.9171 16.4963C18.4493 15.9733 17.6831 15.934 17.1383 16.3747C16.6721 16.7512 16.25 17.1807 15.7955 17.5996Z"
                fill="#82DBF7"
              />
              <path
                d="M13.5293 8.32833C13.5352 6.47417 15.0463 4.9747 16.8978 4.98532C18.7493 4.99594 20.2419 6.50815 20.2329 8.36443C20.2238 10.2 18.7121 11.7 16.875 11.6958C15.0213 11.691 13.5235 10.1835 13.5293 8.32833ZM18.4063 8.34319C18.4079 7.51169 17.724 6.82195 16.8893 6.81293C16.0567 6.80443 15.3665 7.48514 15.3569 8.32355C15.3474 9.17045 16.0392 9.87027 16.8829 9.86656C17.716 9.86337 18.4047 9.17417 18.4063 8.34319Z"
                fill="#82DBF7"
              />
            </g>
            <defs>
              <clipPath id="clip0_122_126">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </>
      ),
    },
    {
      title: "Designer Tool",
      svg: (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_122_130)">
              <path
                d="M7.0907 11.3623C6.42911 10.8637 5.90079 10.2892 5.47548 9.61912C3.1222 5.91452 5.42451 0.861243 9.7684 0.202305C13.2521 -0.326545 16.4603 2.04319 16.9302 5.49292C17.4298 9.15717 14.6592 12.437 10.9344 12.5527C9.60858 12.5942 8.32362 12.7843 7.1284 13.3704C4.10451 14.854 2.38946 17.2736 2.00663 20.6262C1.97689 20.8874 1.96787 21.1508 1.94875 21.4237C1.34026 21.4237 0.74185 21.4237 0.142912 21.4237C-0.0269991 18.2257 1.93282 13.3604 7.0907 11.3623ZM10.7417 10.7066C13.1194 10.7251 15.1079 8.77275 15.127 6.40195C15.1466 3.96903 13.2022 1.98797 10.7831 1.97682C8.38362 1.96567 6.42751 3.89682 6.39619 6.30797C6.36539 8.70213 8.32681 10.6874 10.7417 10.7066Z"
                fill="#8080F7"
              />
              <path
                d="M9.18604 23.8582C9.74037 21.0515 10.2883 18.2857 10.8283 15.5177C10.8586 15.3637 10.934 15.3223 11.0652 15.2862C12.1213 14.9942 13.1736 14.6889 14.2308 14.4021C14.6099 14.2996 14.9269 14.1202 15.2041 13.842C16.7349 12.3064 18.2731 10.7772 19.8071 9.24478C19.8628 9.18903 19.9059 9.12 19.969 9.03876C21.2938 10.3869 22.5878 11.7032 23.8961 13.0349C23.834 13.1007 23.7782 13.1644 23.7177 13.2234C22.1975 14.7069 20.6795 16.1926 19.1535 17.6703C18.8572 17.957 18.665 18.2899 18.5567 18.6828C18.2683 19.731 17.9689 20.7759 17.6859 21.8251C17.6354 22.0126 17.5441 22.0938 17.3582 22.1331C14.7124 22.6938 12.0676 23.2609 9.42285 23.8258C9.35595 23.8402 9.28692 23.8444 9.18604 23.8582ZM13.2267 21.0807C13.2522 21.0844 13.2788 21.0961 13.3021 21.0913C14.2005 20.8997 15.1 20.7101 15.9958 20.5057C16.0706 20.4887 16.1567 20.3798 16.1805 20.2975C16.3749 19.6274 16.5634 18.9552 16.7391 18.2804C16.9329 17.5359 17.2828 16.8903 17.8436 16.3535C18.7568 15.4784 19.6584 14.5906 20.5605 13.7039C20.7921 13.4761 21.0066 13.2313 21.237 12.986C20.8159 12.5841 20.3784 12.1673 19.9101 11.7202C18.768 12.8745 17.6046 14.0496 16.4423 15.2257C15.9974 15.6759 15.4722 15.9844 14.86 16.1501C14.1267 16.3487 13.3956 16.5536 12.6671 16.7692C12.5784 16.7952 12.4621 16.8908 12.4452 16.972C12.2577 17.8577 12.0873 18.7471 11.9126 19.6354C11.9275 19.6492 11.9418 19.6635 11.9567 19.6773C12.631 19.0041 13.3059 18.3303 13.9425 17.6947C14.3938 18.1423 14.825 18.5697 15.2609 19.0014C14.7129 19.5489 14.1485 20.1101 13.5873 20.675C13.4604 20.803 13.3452 20.9432 13.2252 21.0781C13.214 21.0839 13.2023 21.0897 13.1912 21.0961C13.197 21.102 13.2034 21.1073 13.2092 21.1131C13.2145 21.102 13.2209 21.0913 13.2267 21.0807Z"
                fill="#8080F7"
              />
            </g>
            <defs>
              <clipPath id="clip0_122_130">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </>
      ),
    },
  ];

  // Mapping tool names to components
  const toolComponents: Record<string, ReactElement> = {
    "Summarize Writing": <SummarizeTopic />,
    "Freestyle Writing": <FreestylePrompt />,
    "Simplify Writing": <SimplifyPrompt />,
    "Generate Image": <ImagePrompt />,
    "Designer Tool": <DesignerPrompt />,
  };

  window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="container mx-auto">
      <div className="flex flex-row gap-7 p-4 tools-setion">
        <div className="flex flex-col flex-wrap items-center w-[20%] p-[1.5rem] text-sm sm:text-base bg-[#F6F7F9] first:pt-6 gap-3 rounded-[20px] left-tab-section">
          {toolList.map((tool) => (
            <div
              key={tool.title}
              onClick={() => setSelectedTool(tool.title)}
              className={`px-2 w-[100%] sm:py-2 flex flex-col tab-list-section cursor-pointer font-semibold text-[#041D34] ${
                tool.title === selectedTool
                  ? "bg-[#192449] rounded-[20px] text-white"
                  : "bg-orangeLight text-black"
              }`}
            >
              <div className="tab-name-title flex justify-center items-center gap-2">
                {tool.svg}
                <div className="lg:w-[80%] tool-text-block">{tool.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-[80%] mt-[0] right-contant-section">
          {toolComponents[selectedTool]}
        </div>
      </div>
    </div>
  );
}
